import { useEffect, useRef, useState } from "react";

/**
 * Animerer et tall fra forrige verdi opp/ned til target via requestAnimationFrame.
 * Respekterer prefers-reduced-motion ved å returnere target umiddelbart.
 *
 * Brukes til å rulle opp KPI-tall ved sidelaste eller når data oppdateres.
 */
export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState<number>(target);
  const fromRef = useRef<number>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Brukerne vil ikke ha animasjon: hopp rett til target
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    if (Math.abs(target - from) < 0.001) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - t, 4);
      const current = from + (target - from) * eased;
      setValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}
