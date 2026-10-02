import { useState } from 'react';
import {
  ArrowUpRight,
  Mail,
  Github,
  MessageCircle,
  Link as LinkIcon,
} from 'lucide-react';
import type { ContactMethod, Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
export default function ContactSection({
  contacts,
  locale,
  t,
}: {
  contacts: ContactMethod[];
  locale: Locale;
  t: Messages;
}) {
  const [feedback, setFeedback] = useState('');
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(t.copied);
    } catch {
      setFeedback(t.copyFailed);
    }
  }
  return (
    <section id="contact" className="contact-section">
      <div className="eyebrow">
        <span>04</span>
        <span>{t.nav[4]}</span>
      </div>
      <h2>{t.contactTitle}</h2>
      <p>{t.contactSub}</p>
      <div className="contact-methods">
        {contacts.map((method) => {
          const Icon =
            (
              { email: Mail, github: Github, line: MessageCircle } as Record<
                string,
                typeof Mail
              >
            )[method.kind] || LinkIcon;
          return (
            <div className="contact-method" key={method.id}>
              {method.url ? (
                <a
                  href={method.url}
                  target={method.url.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                >
                  <Icon size={21} />
                  <span>
                    {method.label[locale]}
                    <small>{method.value}</small>
                  </span>
                  <ArrowUpRight size={20} />
                </a>
              ) : (
                <button onClick={() => copy(method.value)} aria-label={t.copy}>
                  <Icon size={21} />
                  <span>
                    {method.label[locale]}
                    <small>{method.value}</small>
                  </span>
                  <ArrowUpRight size={20} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="copy-feedback" role="status">
        {feedback}
      </p>
    </section>
  );
}
