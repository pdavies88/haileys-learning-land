import { useRef } from 'react';
import type { View } from 'react-native';

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Remembers where drop targets sit on screen, so a drag can ask "which target is under the finger?".
 * Give each target `ref={targets.register(id)}` and `onLayout={targets.measure(id)}`.
 */
export function useDropTargets() {
  const views = useRef(new Map<string, View>());
  const rects = useRef(new Map<string, Rect>());

  const register = (id: string) => (view: View | null) => {
    if (view) views.current.set(id, view);
    else views.current.delete(id);
  };

  const measure = (id: string) => () => {
    // Wait a frame so the position on screen is final.
    requestAnimationFrame(() => {
      views.current.get(id)?.measureInWindow((x, y, width, height) => rects.current.set(id, { x, y, width, height }));
    });
  };

  /** The target under the point, allowing a little slack around each one for small fingers. */
  const hit = (x: number, y: number, slack = 24): string | null => {
    for (const [id, r] of rects.current) {
      if (x >= r.x - slack && x <= r.x + r.width + slack && y >= r.y - slack && y <= r.y + r.height + slack) return id;
    }
    return null;
  };

  return { register, measure, hit };
}
