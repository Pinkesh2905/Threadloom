import { api } from './api';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 8;

/** Fetches an authenticated endpoint as a blob and triggers a browser save —
 * needed because the JWT lives in localStorage, not a cookie, so a plain
 * <a href> can't carry the Authorization header.
 *
 * The render behind this endpoint may run on a Celery worker instead of
 * inline (see production.tasks) — a 202 means the artifact is still being
 * generated, so this polls a few times before giving up. */
export async function downloadAuthenticatedFile(
  url: string,
  filename: string,
  method: 'get' | 'post' = 'get',
  data?: unknown
) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await api.request({ url, method, data, responseType: 'blob' });
    if (res.status !== 202) {
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('Still generating this file — please try again in a moment.');
}
