import { useEffect, useRef, useState } from 'react';
import type { TechItem, SiteConfig } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
export default function HeroKeyboard3D({
  skills,
  selected,
  onSelect,
  sceneUrl,
  model,
  t,
}: {
  skills: TechItem[];
  selected: string;
  onSelect: (id: string) => void;
  sceneUrl: string | null;
  model: SiteConfig;
  t: Messages;
}) {
  const host = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 768px)');
    const connection = (
      navigator as Navigator & { connection?: { saveData: boolean } }
    ).connection;
    let cleanup = () => {};
    let cancelled = false;
    if (reduced.matches || !desktop.matches || connection?.saveData) return;
    const controller = new AbortController();
    (model.modelUrl ? import('./modelRenderer') : import('./keyboardRenderer'))
      .then(async (module) => {
        if (cancelled) return;
        cleanup =
          'createModel' in module && model.modelUrl
            ? await module.createModel(
                element,
                skills,
                (id) => select.current(id),
                model.modelUrl,
                model.modelBindings || [],
                model.modelInteraction || 'hover',
                controller.signal,
                () => {
                  if (!cancelled) {
                    setReady(false);
                    setFailed(true);
                  }
                },
              )
            : await (
                'createKeyboard' in module
                  ? module.createKeyboard
                  : () => Promise.resolve(() => {})
              )(
                element,
                skills,
                (id) => select.current(id),
                sceneUrl,
                controller.signal,
                () => {
                  if (!cancelled) {
                    setReady(false);
                    setFailed(true);
                  }
                },
              );
        if (cancelled || controller.signal.aborted) {
          cleanup();
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    const change = () => {
      if (reduced.matches || !desktop.matches) {
        controller.abort();
        cleanup();
        setReady(false);
      }
    };
    reduced.addEventListener('change', change);
    desktop.addEventListener('change', change);
    return () => {
      cancelled = true;
      controller.abort();
      cleanup();
      reduced.removeEventListener('change', change);
      desktop.removeEventListener('change', change);
    };
  }, [skills, sceneUrl, model, retry]);
  return (
    <div className="keyboard-visual">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div
        ref={host}
        className={`keyboard-canvas ${ready ? 'ready' : ''}`}
        aria-hidden="true"
      />
      <div
        className={`keyboard-fallback ${ready ? 'hidden-visual' : ''}`}
        inert={ready}
      >
        <div className="keyboard-case">
          {skills.slice(0, 20).map((skill, i) => (
            <button
              key={skill.id}
              className={`keycap key-${i % 4} ${skill.id === selected ? 'selected' : ''}`}
              onClick={() => onSelect(skill.id)}
              aria-label={`${t.keyboardSelect}: ${skill.name}`}
              title={skill.name}
            >
              {skill.name.length > 9 ? skill.name.slice(0, 7) : skill.name}
            </button>
          ))}
        </div>
      </div>
      <div className="keyboard-caption">
        <span className="status-dot" />
        <span>{t.keyboardHint}</span>
        {failed && (
          <button
            onClick={() => {
              setFailed(false);
              setRetry(retry + 1);
            }}
          >
            {t.threeRetry}
          </button>
        )}
      </div>
    </div>
  );
}
