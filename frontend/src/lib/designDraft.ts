/**
 * Local draft persistence for the studio.
 *
 * Losing an in-progress design to a refresh is unrecoverable for the
 * customer — they can't get it back and usually won't start again. The
 * server copy only exists once they've saved (which needs an account), so
 * a local draft is what covers the gap for guests and for edits made
 * between saves.
 */

import type { DesignLayer } from '@/types/designer';

const KEY_PREFIX = 'threadloom:draft:';
/** Drop drafts nobody came back to, rather than resurrecting stale work. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export interface DesignDraft {
  slug: string;
  designId: number | null;
  name: string;
  baseColor: string;
  selectedOptions: Record<string, string>;
  layers: DesignLayer[];
  savedAt: number;
}

const keyFor = (slug: string) => `${KEY_PREFIX}${slug}`;

export function saveDraft(draft: Omit<DesignDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: DesignDraft = { ...draft, savedAt: Date.now() };
    window.localStorage.setItem(keyFor(draft.slug), JSON.stringify(payload));
  } catch {
    // Private mode or a full quota — a lost draft must never break editing.
  }
}

export function loadDraft(slug: string): DesignDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(slug));
    if (!raw) return null;
    const draft = JSON.parse(raw) as DesignDraft;
    if (!draft || typeof draft !== 'object' || !Array.isArray(draft.layers)) return null;
    if (Date.now() - (draft.savedAt ?? 0) > MAX_AGE_MS) {
      window.localStorage.removeItem(keyFor(slug));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(slug));
  } catch {
    /* nothing useful to do */
  }
}
