import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import type { Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
const ids = ['hero', 'tech', 'experience', 'projects', 'contact'];
function LotusMark() {
  return (
    <svg width="27" height="27" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 4C7 13 8 23 16 27C24 23 25 13 16 4Z M16 27C5 27 1 19 3 12C10 12 16 18 16 27Z M16 27C27 27 31 19 29 12C22 12 16 18 16 27Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
export default function Navbar({
  name,
  locale,
  change,
  t,
}: {
  name: string;
  locale: Locale;
  change: (l: Locale) => void;
  t: Messages;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const header = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusWhenExpanded = useRef(false);
  const focusNavigation = () => {
    requestAnimationFrame(() => {
      if (!header.current?.classList.contains('is-collapsed'))
        header.current
          ?.querySelector<HTMLAnchorElement>('.nav-links a')
          ?.focus({ preventScroll: true });
    });
  };
  const collapsed = scrolled && !expanded;
  useEffect(() => {
    const collapseForScroll = () => {
      focusWhenExpanded.current = false;
      setExpanded(false);
      setOpen(false);
    };
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (y <= 8) collapseForScroll();
      if (y > 8 && header.current?.contains(document.activeElement)) {
        requestAnimationFrame(() => {
          if (header.current?.classList.contains('is-collapsed'))
            trigger.current?.focus({ preventScroll: true });
        });
      }
    };
    const scrollKey = (event: KeyboardEvent) => {
      if (
        event.key === ' ' &&
        (event.target as HTMLElement)?.closest(
          'button, a, input, select, textarea, [contenteditable]',
        )
      )
        return;
      if (
        [
          'ArrowDown',
          'ArrowUp',
          'PageDown',
          'PageUp',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      )
        collapseForScroll();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    // Layout shifts (including translations) can change scrollY without a user scroll.
    window.addEventListener('wheel', collapseForScroll, { passive: true });
    window.addEventListener('touchmove', collapseForScroll, { passive: true });
    window.addEventListener('keydown', scrollKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', collapseForScroll);
      window.removeEventListener('touchmove', collapseForScroll);
      window.removeEventListener('keydown', scrollKey);
    };
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (expanded && !header.current?.contains(event.target as Node)) {
        focusWhenExpanded.current = false;
        setExpanded(false);
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (!expanded && !open)) return;
      focusWhenExpanded.current = false;
      setExpanded(false);
      setOpen(false);
      if (scrolled)
        requestAnimationFrame(() =>
          trigger.current?.focus({ preventScroll: true }),
        );
      else
        header.current
          ?.querySelector<HTMLButtonElement>('.menu-toggle')
          ?.focus();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [expanded, open, scrolled]);
  const closeMenu = () => {
    focusWhenExpanded.current = false;
    setOpen(false);
    setExpanded(false);
  };
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header
        ref={header}
        className={`navbar${collapsed ? ' is-collapsed' : ''}`}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === 'width' &&
            focusWhenExpanded.current &&
            !collapsed
          ) {
            focusWhenExpanded.current = false;
            focusNavigation();
          }
        }}
      >
        <button
          ref={trigger}
          className="navbar-trigger"
          aria-label={t.openMenu}
          aria-expanded={!collapsed}
          aria-controls="portfolio-navigation"
          onClick={() => {
            focusWhenExpanded.current = true;
            setExpanded(true);
            setOpen(true);
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              focusWhenExpanded.current = false;
              focusNavigation();
            }
          }}
        >
          <LotusMark />
        </button>
        <a className="brand" href="#hero" onClick={closeMenu}>
          <LotusMark />
          <span>
            {name}
            <i>®</i>
          </span>
        </a>
        <nav
          id="portfolio-navigation"
          className={open ? 'nav-links is-open' : 'nav-links'}
          aria-label={locale === 'en' ? 'Main navigation' : '主選單'}
        >
          {ids.slice(1).map((id, i) => (
            <a href={`#${id}`} key={id} onClick={closeMenu}>
              {t.nav[i + 1]}
              {id === 'contact' && <ArrowUpRight size={14} />}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <div className="language-switch">
            <button
              className={locale === 'zh-TW' ? 'active' : ''}
              onClick={() => change('zh-TW')}
              aria-label="繁體中文"
              aria-pressed={locale === 'zh-TW'}
            >
              中
            </button>
            <span>/</span>
            <button
              className={locale === 'en' ? 'active' : ''}
              onClick={() => change('en')}
              aria-label="English"
              aria-pressed={locale === 'en'}
            >
              EN
            </button>
          </div>
          <button
            className="menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
