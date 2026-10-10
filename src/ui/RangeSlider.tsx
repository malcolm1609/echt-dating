import { useRef, useState } from 'react';
import { Animated, PanResponder, Platform, View } from 'react-native';
import { useScrollLock } from './ScrollLock';
import { colors } from './theme';

const native = Platform.OS !== 'web';
const THUMB = 28;

/** Rechnet eine Fingerposition auf der Leiste in einen Wert im Raster um. */
export function valueAt(x: number, width: number, min: number, max: number, step: number) {
  if (width <= 0) return min;
  const raw = min + (Math.max(0, Math.min(width, x)) / width) * (max - min);
  return Math.max(min, Math.min(max, Math.round((raw - min) / step) * step + min));
}

/**
 * Welcher Griff bewegt wird: der nähere. Liegen beide (fast) aufeinander, entscheidet die Richtung
 * der ersten Bewegung (links = unterer, rechts = oberer Griff), damit man sie wieder auseinanderziehen kann.
 */
export function pickThumb(x: number, positions: number[], dx = 0): number | null {
  if (positions.length === 1) return 0;
  const [a, b] = positions.map((p) => Math.abs(x - p));
  if (Math.abs(a - b) < 6 && Math.abs(positions[0] - positions[1]) < THUMB) return dx === 0 ? null : dx < 0 ? 0 : 1;
  return a <= b ? 0 : 1;
}

interface Props {
  min: number;
  max: number;
  step?: number;
  /** Ein Wert (ein Griff) oder zwei Werte (Bereich mit zwei Griffen). */
  values: number[];
  onChange: (values: number[]) => void;
  /** Vorlesetext je Griff, z. B. „Ab 22 Jahre“. */
  labels: (value: number, index: number) => string;
  /** Bei einem Griff: Von hier aus wird die Leiste gefüllt, z. B. 0 bei Reglern mit Minus und Plus. */
  origin?: number;
}

// Schieberegler mit einem oder zwei Griffen. Ziehen geht überall auf der Leiste, Antippen springt
// dorthin. Der Griff wird beim Anfassen größer und federt beim Loslassen zurück; Screenreader können
// ihn schrittweise verstellen.
export function RangeSlider({ min, max, step = 1, values, onChange, labels, origin = min }: Props) {
  const track = useRef<View>(null);
  const [width, setWidth] = useState(0);
  const left = useRef(0);
  const [active, setActive] = useState<number | null>(null);
  const pos = (v: number, w = width) => (w * (v - min)) / (max - min || 1);
  const lockScroll = useScrollLock();
  const live = useRef({ width, values, onChange, lockScroll });
  live.current = { width, values, onChange, lockScroll };
  const range = values.length === 2;

  const set = (i: number, v: number) => {
    const { values: now, onChange: emit } = live.current;
    const next = [...now];
    const lo = now.length === 2 && i === 1 ? now[0] : min;
    const hi = now.length === 2 && i === 0 ? now[1] : max;
    next[i] = Math.max(lo, Math.min(hi, v));
    if (next[i] !== now[i]) emit(next);
  };

  const drag = useRef({ thumb: null as number | null, offset: 0 });
  const at = (pageX: number) => pageX - left.current - drag.current.offset;
  const begin = (x: number, dx: number) => {
    const { values: now, width: w } = live.current;
    const positions = now.map((v) => pos(v, w));
    const thumb = pickThumb(x, positions, dx);
    if (thumb === null) return;
    drag.current.thumb = thumb;
    // Wer den Griff selbst anfasst, zieht ihn ohne Sprung; wer daneben tippt, holt ihn dorthin.
    drag.current.offset = Math.abs(x - positions[thumb]) <= THUMB / 2 ? x - positions[thumb] : 0;
    setActive(thumb);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Waagrechtes Ziehen gehört dem Regler, nicht der umgebenden Liste.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => {
        drag.current = { thumb: null, offset: 0 };
        // Solange der Finger auf dem Regler ist, scrollt die Seite nicht mit.
        live.current.lockScroll(true);
        // Position der Leiste frisch messen: die Seite kann inzwischen gescrollt sein.
        track.current?.measureInWindow((x) => {
          left.current = x;
        });
        begin(g.x0 - left.current, 0);
        if (drag.current.thumb !== null && drag.current.offset === 0) {
          set(drag.current.thumb, valueAt(g.x0 - left.current, live.current.width, min, max, step));
        }
      },
      onPanResponderMove: (_, g) => {
        if (drag.current.thumb === null) begin(g.x0 - left.current, g.dx);
        if (drag.current.thumb === null) return;
        set(drag.current.thumb, valueAt(at(g.moveX), live.current.width, min, max, step));
      },
      onPanResponderRelease: () => {
        live.current.lockScroll(false);
        setActive(null);
      },
      onPanResponderTerminate: () => {
        live.current.lockScroll(false);
        setActive(null);
      },
    }),
  ).current;

  return (
    <View
      ref={track}
      {...pan.panHandlers}
      style={{ height: 44, justifyContent: 'center', marginHorizontal: THUMB / 2, ...Platform.select({ web: { touchAction: 'none', cursor: 'pointer', userSelect: 'none' } as object, default: {} }) }}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        track.current?.measureInWindow((x) => {
          left.current = x;
        });
      }}
    >
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line }} />
      <View
        style={{
          position: 'absolute',
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.accent,
          left: range ? pos(values[0]) : Math.min(pos(origin), pos(values[0])),
          width: range ? Math.max(0, pos(values[1]) - pos(values[0])) : Math.abs(pos(values[0]) - pos(origin)),
        }}
      />
      {values.map((v, i) => (
        <Thumb
          key={i}
          x={pos(v)}
          held={active === i}
          label={labels(v, i)}
          onStep={(dir) => set(i, live.current.values[i] + dir * step)}
          // Liegen beide Griffe ganz rechts aufeinander, liegt der untere oben, damit man ihn erreicht.
          zIndex={range && i === 0 && values[0] === max ? 2 : 1}
        />
      ))}
    </View>
  );
}

function Thumb({ x, held, label, onStep, zIndex }: { x: number; held: boolean; label: string; onStep: (dir: 1 | -1) => void; zIndex: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const was = useRef(held);
  if (was.current !== held) {
    was.current = held;
    Animated.spring(scale, { toValue: held ? 1.25 : 1, friction: 5, tension: 160, useNativeDriver: native }).start();
  }

  return (
    <Animated.View
      // Finger und Maus treffen immer die Leiste: Ein angeklickter Griff würde im Browser den Fokus
      // bekommen, die Seite dorthin scrollen und damit das Ziehen abbrechen.
      pointerEvents="none"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{
        position: 'absolute',
        left: x - THUMB / 2,
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB / 2,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        zIndex,
        transform: [{ scale }],
        ...Platform.select({
          web: { boxShadow: '0 2px 8px rgba(23,23,23,0.22)' } as object,
          default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
        }),
      }}
    />
  );
}
