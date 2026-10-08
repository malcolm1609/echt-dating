import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Ohne Zugangsdaten null: dann läuft die App im Demo-Modus. */
export const supabase = url && key
  ? createClient(url, key, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

/** Testbetrieb mit Server: SMS- und Ausweisprüfung lassen sich überspringen (die Datenbank prüft das selbst). */
export const beta = !!supabase && process.env.EXPO_PUBLIC_BETA === '1';
