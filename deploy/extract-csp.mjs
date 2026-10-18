/** Prints an Nginx CSP add_header line for a built index.html, appending frame-ancestors 'none'. */
import { readFileSync } from 'node:fs';

const html = readFileSync(process.argv[2], 'utf8');
const match = html.match(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i);

if (!match) {
  console.error('No Content-Security-Policy meta tag found in the built index.html.');
  process.exit(1);
}

const policy = match[1].replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
console.log(`add_header Content-Security-Policy "${policy}; frame-ancestors 'none'" always;`);
