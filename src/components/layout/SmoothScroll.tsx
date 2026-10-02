import { useEffect } from 'react';
export default function SmoothScroll() {
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('lenis')
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        const lenis = new Lenis({
          autoRaf: true,
          anchors: true,
          duration: 0.8,
          smoothWheel: true,
        });
        const dialog = (event: Event) => {
          if ((event as CustomEvent<boolean>).detail) lenis.stop();
          else lenis.start();
        };
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const reduced = () => {
          if (media.matches) lenis.destroy();
        };
        window.addEventListener('lotus:dialog', dialog);
        media.addEventListener('change', reduced);
        cleanup = () => {
          lenis.destroy();
          window.removeEventListener('lotus:dialog', dialog);
          media.removeEventListener('change', reduced);
        };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return null;
}
