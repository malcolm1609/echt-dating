import { supabase } from './supabase';

// In profiles stehen Speicherpfade (<user-id>/<datei>); Platzhalter der Beispielprofile und Bilder aus dem
// Demo-Modus sind schon vollständige Adressen.
export function photoUrl(path: string): string {
  if (/^(https?|file|blob|data|content|ph):/.test(path) || !supabase) return path;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export const photoUrls = (paths?: string[] | null) => (paths ?? []).map(photoUrl);

export const MAX_PHOTOS = 6;

/** Platzhalter für Demo und Beispielprofile: gezeichnete Figuren statt fremder Gesichter. */
export const placeholderPhoto = (seed: string) =>
  `https://api.dicebear.com/9.x/notionists/png?size=256&seed=${encodeURIComponent(seed)}&backgroundColor=e8ddd6,d9e2d5,dcd6e4,d5dfe6`;
