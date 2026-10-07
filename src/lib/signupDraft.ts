import type { ProfileContent } from '../domain/profileContent.ts';
import type { CompleteProfile } from '../ui/ProfileForm';

// Profil und Fragen warten im Speicher, gespeichert wird alles zusammen mit dem Standort.
let draft: { profile: CompleteProfile; content?: ProfileContent } | null = null;

export const signupDraft = {
  set: (profile: CompleteProfile) => {
    draft = { profile, content: draft?.content };
  },
  setContent: (content: ProfileContent) => {
    if (draft) draft = { ...draft, content };
  },
  get: () => draft,
  clear: () => {
    draft = null;
  },
};
