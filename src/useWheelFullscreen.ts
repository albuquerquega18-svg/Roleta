import { useEffect, useRef, useState } from 'react';

// Keep an in-page presentation mode when native fullscreen is unavailable or denied.
export function useWheelFullscreen() {
  const panel = useRef<HTMLElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const nativeActive = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    function syncFullscreen() {
      if (document.fullscreenElement === panel.current) {
        nativeActive.current = true;
        setFullscreen(true);
      } else if (nativeActive.current) {
        nativeActive.current = false;
        setFullscreen(false);
      }
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => { document.removeEventListener('fullscreenchange', syncFullscreen); };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    toggleButton.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        exit();
      } else if (event.key === 'Tab') {
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      toggleButton.current?.focus({ preventScroll: true });
    };
  }, [fullscreen]);

  function exit() {
    setFullscreen(false);
    if (document.fullscreenElement === panel.current) {
      void document.exitFullscreen().catch(() => { setFullscreen(true); });
    }
  }

  function toggleFullscreen() {
    if (fullscreen) { exit(); return; }
    setFullscreen(true);
    if (panel.current?.requestFullscreen && document.fullscreenEnabled) {
      void panel.current.requestFullscreen().catch(() => {
        // The in-page mode already covers the viewport and remains usable.
      });
    }
  }

  return { panel, toggleButton, fullscreen, toggleFullscreen };
}
