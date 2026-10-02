import type { ReactNode } from 'react';
export default function SectionHeading({
  number,
  label,
  title,
  subtitle,
  action,
}: {
  number: string;
  label: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="section-heading">
      <div className="eyebrow">
        <span>{number}</span>
        <span>{label}</span>
      </div>
      {title &&
        (action ? (
          <div className="section-title-row">
            <h2>{title}</h2>
            {action}
          </div>
        ) : (
          <h2>{title}</h2>
        ))}
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
