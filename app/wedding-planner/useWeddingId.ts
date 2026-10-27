'use client';

import { useEffect, useState } from 'react';

/**
 * Resolve the logged-in user's wedding id from GET /api/wedding.
 *
 * Replaces the old hardcoded DEMO_WEDDING_ID, which made every user read and
 * write the same wedding. `weddingId` is null while loading or when the user
 * has not created a wedding yet (`hasWedding === false`).
 */
export function useWeddingId() {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasWedding, setHasWedding] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/wedding');
        const data = res.ok ? await res.json() : null;
        const id: string | null = data?.wedding?.id ?? null;
        if (!cancelled) {
          setWeddingId(id);
          setHasWedding(Boolean(id));
        }
      } catch {
        if (!cancelled) setHasWedding(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { weddingId, loading, hasWedding };
}
