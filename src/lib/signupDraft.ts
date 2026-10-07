import type { CompleteProfile } from '../ui/ProfileForm';

// Das Profil wartet zwischen „Über dich“ und „Standort“ im Speicher, gespeichert wird es erst mit Standort.
let draft: CompleteProfile | null = null;

export const signupDraft = {
  set: (p: CompleteProfile) => {
    draft = p;
  },
  get: () => draft,
  clear: () => {
    draft = null;
  },
};
