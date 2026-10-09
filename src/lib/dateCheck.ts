import type { SupabaseClient } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform, Share } from 'react-native';
import { checkLink, DateCheck, DateCheckAnswer, DateCheckView, LOCATION_EVERY_MS } from '../domain/dateCheck.ts';
import { matchStore } from './matches';
import { photoUrl } from './photos';
import { supabase } from './supabase';

/** Adresse der Web-Version; dort liegt die Seite für die Vertrauensperson. */
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://malcolm1609.github.io/echt-dating';
export const linkFor = (token: string) => checkLink(APP_URL, token);

export interface DateCheckApi {
  /** Der laufende Check für das Date mit diesem Match, sonst null. */
  current(other: string): Promise<DateCheck | null>;
  start(other: string, contactName: string, contactPhone: string): Promise<DateCheck>;
  answer(token: string, answer: DateCheckAnswer): Promise<DateCheck | null>;
  sendLocation(token: string, lat: number, lng: number): Promise<void>;
  /** Für die Seite der Vertrauensperson, ohne Anmeldung. null bei falschem Link. */
  view(token: string): Promise<DateCheckView | null>;
}

interface ServerCheck { token: string; check_at: string; status: 'active' | 'help' | 'ended'; contact_name: string; overdue?: boolean }

const fromServer = (c: ServerCheck | null): DateCheck | null =>
  c && c.status !== 'ended' ? { token: c.token, checkAt: new Date(c.check_at), status: c.status, contactName: c.contact_name, overdue: !!c.overdue } : null;

export function serverDateCheckApi(db: SupabaseClient): DateCheckApi {
  const rpc = async <T>(fn: string, args: object) => {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };
  return {
    current: async (other) => fromServer(await rpc<ServerCheck | null>('current_date_check', { other })),
    start: async (other, contactName, contactPhone) =>
      fromServer(await rpc<ServerCheck>('start_date_check', { other, contact_name: contactName, contact_phone: contactPhone }))!,
    answer: async (token, answer) => fromServer(await rpc<ServerCheck>('answer_date_check', { p_token: token, answer })),
    sendLocation: async (token, lat, lng) => { await rpc('date_check_location', { p_token: token, lat, lng }); },
    view: async (token) => {
      const v = await rpc<any>('date_check_public', { p_token: token });
      if (!v) return null;
      return {
        name: v.name,
        photo: v.photo ? photoUrl(v.photo) : null,
        match: v.match ? { name: v.match.name, age: v.match.age, photo: v.match.photo ? photoUrl(v.match.photo) : null } : null,
        place: v.place ?? null,
        when: v.when ?? null,
        status: v.status,
        checkAt: new Date(v.check_at ?? Date.now()),
        location: v.location ? { lat: v.location.lat, lng: v.location.lng, at: new Date(v.location.at) } : null,
      };
    },
  };
}

/** Demo ohne Server: alles im Speicher, keine SMS. */
export function demoDateCheckApi(): DateCheckApi {
  const checks = new Map<string, DateCheck & { other: string; ended: boolean; lat?: number; lng?: number; at?: Date }>();
  const open = (token: string) => {
    const c = checks.get(token);
    if (!c || c.ended) throw new Error('no date check');
    return c;
  };
  const plain = ({ token, checkAt, status, contactName, overdue }: DateCheck): DateCheck => ({ token, checkAt, status, contactName, overdue });
  return {
    current: async (other) => {
      const c = [...checks.values()].find((x) => x.other === other && !x.ended);
      return c ? plain(c) : null;
    },
    start: async (other, contactName, contactPhone) => {
      if (!/^\+[1-9]\d{7,14}$/.test(contactPhone)) throw new Error('contact_phone');
      for (const c of checks.values()) if (c.other === other) c.ended = true;
      const token = `demo${Date.now()}`;
      checks.set(token, { token, other, contactName, checkAt: new Date(Date.now() + 60 * 60 * 1000), status: 'active', overdue: false, ended: false });
      return plain(checks.get(token)!);
    },
    answer: async (token, answer) => {
      const c = open(token);
      if (answer === 'ok') { c.ended = true; c.lat = c.lng = undefined; return null; }
      if (answer === 'later') c.checkAt = new Date(Math.max(c.checkAt.getTime(), Date.now()) + 60 * 60 * 1000);
      if (answer === 'help') c.status = 'help';
      return plain(c);
    },
    sendLocation: async (token, lat, lng) => { Object.assign(open(token), { lat, lng, at: new Date() }); },
    view: async (token) => {
      const c = checks.get(token);
      if (!c) return null;
      const m = matchStore.get(c.other);
      const overdue = c.status === 'active' && Date.now() > c.checkAt.getTime() + 15 * 60 * 1000;
      return {
        name: 'Du',
        photo: null,
        match: c.ended ? null : { name: m?.name ?? 'Dein Match', age: m?.age ?? 0, photo: m?.photos?.[0] ?? null },
        place: m?.date?.place ?? null,
        when: m?.date?.when ?? null,
        status: c.ended ? 'ended' : c.status === 'help' ? 'help' : overdue ? 'overdue' : 'active',
        checkAt: c.checkAt,
        location: !c.ended && c.lat != null && c.at ? { lat: c.lat, lng: c.lng!, at: c.at } : null,
      };
    },
  };
}

export const dateCheckApi: DateCheckApi = supabase ? serverDateCheckApi(supabase) : demoDateCheckApi();

/** Was der Date-Check vom Handy braucht: teilen, Standort und Erinnerung. In Tests ersetzbar. */
export interface DateCheckDevice {
  share(message: string): Promise<boolean>;
  /** Sendet den Standort, solange die App offen ist. false, wenn der Standort nicht erlaubt ist. Gibt das Beenden zurück. */
  track(send: (lat: number, lng: number) => void): Promise<{ allowed: boolean; stop: () => void }>;
  /** Benachrichtigung „Alles okay?“ zur Fragezeit; im Browser nicht möglich. */
  remind(at: Date): Promise<string | null>;
  cancelReminder(id: string): Promise<void>;
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export const dateCheckDevice: DateCheckDevice = {
  share: async (message) => {
    try {
      const r = await Share.share({ message });
      return r.action !== Share.dismissedAction;
    } catch {
      return false;
    }
  },
  track: async (send) => {
    const noop = { allowed: false, stop: () => {} };
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return noop;
      let last = 0;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 25 },
        ({ coords }) => {
          if (Date.now() - last < LOCATION_EVERY_MS) return;
          last = Date.now();
          send(coords.latitude, coords.longitude);
        },
      );
      return { allowed: true, stop: () => sub.remove() };
    } catch {
      return noop;
    }
  },
  remind: async (at) => {
    if (Platform.OS === 'web' || at.getTime() <= Date.now()) return null;
    try {
      const { granted } = await Notifications.requestPermissionsAsync();
      if (!granted) return null;
      return await Notifications.scheduleNotificationAsync({
        content: { title: 'Alles okay?', body: 'Tippe kurz und sag uns, ob bei deinem Date alles gut ist.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    } catch {
      return null;
    }
  },
  cancelReminder: async (id) => {
    if (Platform.OS !== 'web') await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  },
};
