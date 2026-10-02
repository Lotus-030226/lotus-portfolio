import type { Metadata } from 'next';
import { LocalContentRepository } from '../lib/content/LocalContentRepository';
import { siteUrl, assetPath } from '../lib/utils/paths';
import './globals.css';
export async function generateMetadata(): Promise<Metadata> {
  const site = await new LocalContentRepository().getSiteConfig();
  const origin = siteUrl();
  return {
    title: `${site.displayName} | ${site.roles.join(' • ')}`,
    description: site.description,
    keywords: [...site.roles, 'RAG', 'Workflow Automation'],
    metadataBase: origin || undefined,
    alternates: origin ? { canonical: origin.toString() } : undefined,
    openGraph: {
      title: `${site.displayName} | ${site.roles.join(' • ')}`,
      description: site.description,
      type: 'website',
      images: origin
        ? [new URL(assetPath('/assets/og.png'), origin).toString()]
        : [],
    },
    icons: { icon: assetPath('/icon.svg') },
  };
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
