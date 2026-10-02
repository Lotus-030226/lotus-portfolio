import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const { site } = JSON.parse(
  readFileSync(
    new URL('../src/content/generated/portfolio.json', import.meta.url),
    'utf8',
  ),
);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0b1016"/><circle cx="1020" cy="315" r="270" fill="none" stroke="#203239"/><circle cx="1020" cy="315" r="210" fill="none" stroke="#203239"/><text x="76" y="130" fill="#b8e9df" font-family="sans-serif" font-size="20" letter-spacing="5">AI × ENGINEERING</text><text x="65" y="350" fill="#edf2f5" font-family="sans-serif" font-weight="bold" font-size="150">${escape(site.displayName.slice(0, 18))}<tspan fill="#b8e9df">.</tspan></text><text x="76" y="435" fill="#aebac5" font-family="sans-serif" font-size="28">${escape(site.roles.join(' / ').slice(0, 65))}</text><rect x="76" y="500" width="110" height="4" fill="#b8e9df"/></svg>`;
const target = new URL('../public/assets/og.png', import.meta.url);
const temporary = new URL('../public/assets/og.partial.png', import.meta.url);
writeFileSync(temporary, await sharp(Buffer.from(svg)).png().toBuffer());
renameSync(temporary, target);
