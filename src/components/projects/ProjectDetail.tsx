import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project, Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
import { assetPath } from '../../lib/utils/paths';
export default function ProjectDetail({
  project,
  locale,
  t,
  close,
}: {
  project: Project;
  locale: Locale;
  t: Messages;
  close: () => void;
}) {
  const images = [project.cover, ...project.gallery].filter(
    (asset, index, list) =>
      asset && list.findIndex((x) => x?.src === asset.src) === index,
  );
  const [imageIndex, setImageIndex] = useState(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const changeImage = (delta: number) =>
    setImageIndex((i) =>
      images.length ? (i + delta + images.length) % images.length : 0,
    );
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const active = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('lotus:dialog', { detail: true }));
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      window.dispatchEvent(new CustomEvent('lotus:dialog', { detail: false }));
      active?.focus();
    };
  }, []);
  return (
    <dialog
      className="project-dialog"
      data-lenis-prevent
      ref={ref}
      aria-labelledby="project-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="dialog-top">
        <span className="eyebrow">{t.projectDetails}</span>
        <button aria-label={t.close} onClick={close}>
          <X size={23} />
        </button>
      </div>
      <div className="project-title-row">
        <h2 id="project-detail-title">{project.title[locale]}</h2>
        {project.period && (
          <span className="project-period">{project.period}</span>
        )}
      </div>
      {project.role?.[locale]?.trim() && (
        <p className="project-role">{project.role[locale]}</p>
      )}
      <p className="project-description">{project.description[locale]}</p>
      {project.highlights.length > 0 && (
        <div className="detail-block">
          <h3>{t.highlights}</h3>
          <ul>
            {project.highlights.map((h, i) => (
              <li key={i}>{h[locale]}</li>
            ))}
          </ul>
        </div>
      )}
      {project.technologies.length > 0 && (
        <div className="detail-block">
          <h3>{t.technology}</h3>
          <div className="tags">
            {project.technologies.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      )}
      {images.length > 0 && (
        <div
          className="project-carousel"
          aria-roledescription="carousel"
          aria-label={project.title[locale]}
        >
          <div
            className="carousel-stage"
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' || e.button === 0) {
                gesture.current = { x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }}
            onPointerCancel={() => {
              gesture.current = null;
            }}
            onPointerUp={(e) => {
              const start = gesture.current;
              gesture.current = null;
              if (!start) return;
              const dx = e.clientX - start.x,
                dy = e.clientY - start.y;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3)
                changeImage(dx < 0 ? 1 : -1);
            }}
          >
            <Image
              src={assetPath(images[imageIndex]!.src)}
              alt={
                images[imageIndex]!.alt[locale] ||
                `${project.title[locale]} ${imageIndex + 1}`
              }
              width={1000}
              height={650}
              className="gallery-image"
              draggable={false}
            />
          </div>
          {images.length > 1 && (
            <div className="carousel-controls">
              <button
                type="button"
                aria-label={t.previousImage}
                onClick={() => changeImage(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <span role="status" aria-live="polite">
                {imageIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                aria-label={t.nextImage}
                onClick={() => changeImage(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="detail-links">
        {project.githubUrl && (
          <a
            className="button secondary"
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.github}
            <ArrowUpRight size={16} />
          </a>
        )}
        {project.demoUrl && (
          <a
            className="button primary"
            href={project.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.demo}
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </dialog>
  );
}
