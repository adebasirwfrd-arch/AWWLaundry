/** Normalisasi callbackUrl agar selalu path relatif (bukan full URL). */
export function safeCallbackUrl(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.pathname + url.search || fallback;
  } catch {
    return fallback;
  }
}
