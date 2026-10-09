import { createContext, useCallback, useContext, useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

const Lock = createContext<(locked: boolean) => void>(() => {});

/** Sperrt die umgebende ScrollView, solange ein Regler gezogen wird. Außerhalb einer LockableScrollView passiert nichts. */
export const useScrollLock = () => useContext(Lock);

// ScrollView, die sich von innen sperren lässt. Auf dem iPhone scrollt die Seite sonst ein Stück mit,
// wenn der Finger beim seitlichen Ziehen eines Reglers leicht nach oben oder unten wandert.
export function LockableScrollView(props: ScrollViewProps) {
  const [locked, setLocked] = useState(false);
  const lock = useCallback((l: boolean) => setLocked(l), []);
  return (
    <Lock.Provider value={lock}>
      <ScrollView {...props} scrollEnabled={!locked && props.scrollEnabled !== false} />
    </Lock.Provider>
  );
}
