import { useEffect, useRef, useState } from 'react';
import { RouletteAudio } from './rouletteAudio';

const SOUND_KEY = 'roleta:sound';

export function useRouletteAudio() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  const enabled = useRef(soundEnabled);
  const engine = useRef<RouletteAudio | null>(null);
  const rollEndsAt = useRef(0);

  function audio() { return engine.current ??= new RouletteAudio(); }

  useEffect(() => {
    try { localStorage.setItem(SOUND_KEY, String(soundEnabled)); } catch { /* Sound is still usable without storage. */ }
  }, [soundEnabled]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) engine.current?.stop();
      else if (enabled.current && rollEndsAt.current > performance.now()) {
        void audio().roll(rollEndsAt.current - performance.now());
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      rollEndsAt.current = 0;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  function startRoll(durationMs: number) {
    rollEndsAt.current = performance.now() + durationMs;
    if (enabled.current && !document.hidden) void audio().roll(durationMs);
  }

  function celebrate() {
    rollEndsAt.current = 0;
    if (enabled.current && !document.hidden) void audio().celebrate();
    else engine.current?.stop();
  }

  function toggleSound() {
    enabled.current = !enabled.current;
    setSoundEnabled(enabled.current);
    if (!enabled.current) engine.current?.stop();
    else if (!document.hidden && rollEndsAt.current > performance.now()) {
      void audio().roll(rollEndsAt.current - performance.now());
    }
  }

  return { soundEnabled, toggleSound, startRoll, celebrate };
}
