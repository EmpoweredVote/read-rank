import { useEffect, useRef } from 'react';

/**
 * Fades the content at whichever edge of a scroll container still has more to
 * reveal (top fades in once scrolled down, bottom fades while more is below).
 * Uses a CSS mask driven by --fade-top / --fade-bot so it matches any surface
 * or theme. Attach the returned ref to the scrollable element.
 */
export function useScrollFade<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('scroll-fade');

    const update = () => {
      const max = el.scrollHeight - el.clientHeight - 1;
      el.style.setProperty('--fade-top', el.scrollTop > 4 ? '26px' : '0px');
      el.style.setProperty('--fade-bot', el.scrollTop < max - 4 ? '30px' : '0px');
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    // Content can grow/shrink (rows added, disagreed expanded) without the box
    // resizing, so watch both the box and its subtree where supported.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(update) : null;
    mo?.observe(el, { childList: true, subtree: true });
    window.addEventListener('resize', update);

    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return ref;
}
