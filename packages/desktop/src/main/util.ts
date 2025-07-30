import { URL } from 'url';
import path from 'path';

export const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

export function resolveHtmlPath(htmlFileName: string) {
  if (isDev) {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, './renderer/', htmlFileName)}`;
}