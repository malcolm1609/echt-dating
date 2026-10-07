import { Redirect } from 'expo-router';

// Unbekannte Adressen (z. B. wenn die Web-Vorschau unter einem anderen Pfad läuft) starten vorne.
export default function NotFound() {
  return <Redirect href="/" />;
}
