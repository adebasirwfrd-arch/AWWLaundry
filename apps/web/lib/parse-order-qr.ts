/**
 * Extract an order / pickup tracking code from QR text.
 * Supports full track URLs, query params, or raw codes (JKT01-..., PJ-...).
 */
export function parseOrderFromQr(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  // Full URL from receipt QR
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const fromQuery = url.searchParams.get('order');
      if (fromQuery?.trim()) return fromQuery.trim();

      const pathMatch = url.pathname.match(/\/track\/([^/?#]+)/i);
      if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    } catch {
      /* fall through */
    }
  }

  // Raw order number or pickup code
  if (/^[A-Z0-9]+-\d{8}-\d+$/i.test(text)) return text.toUpperCase();
  if (/^PJ-[A-Z0-9-]+$/i.test(text)) return text.toUpperCase();

  // Last segment after slash (some QR encoders)
  const slashPart = text.split('/').pop()?.split('?')[0]?.trim();
  if (slashPart && slashPart.length >= 6) return slashPart;

  return text.length >= 4 ? text : null;
}
