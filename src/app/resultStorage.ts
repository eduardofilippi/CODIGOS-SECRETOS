import type { Prize, PromoCodeResult } from '../types/promo';

const KEY = 'purosol:last-result:v1';
const RESULT_STATUSES = ['WIN', 'LOSE', 'CODE_ALREADY_USED', 'CODE_NOT_FOUND'];

/** Display cache for this tab, never proof of a prize or a reason to redeem again. */
function parseResult(value: unknown): PromoCodeResult | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Record<string, unknown>;
  if (
    typeof result.status !== 'string' || !RESULT_STATUSES.includes(result.status) ||
    typeof result.code !== 'string' || !result.code.trim() ||
    typeof result.codeCount !== 'number' || !Number.isInteger(result.codeCount) ||
    result.codeCount < 0
  ) return null;

  let prize: Prize | undefined;
  if (result.status === 'WIN' && result.prize != null) {
    if (typeof result.prize !== 'object') return null;
    const p = result.prize as Record<string, unknown>;
    if (typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name.trim()) {
      return null;
    }
    prize = {
      id: p.id,
      name: p.name,
      image: typeof p.image === 'string' ? p.image : '',
      article: typeof p.article === 'string' ? p.article : undefined,
    };
  }
  return {
    status: result.status as PromoCodeResult['status'],
    code: result.code,
    codeCount: result.codeCount,
    prize,
  };
}

export function readLastResult(): PromoCodeResult | null {
  try {
    return parseResult(JSON.parse(sessionStorage.getItem(KEY) ?? 'null'));
  } catch {
    return null;
  }
}

export function storeLastResult(result: PromoCodeResult | null): void {
  try {
    const stored = parseResult(result);
    if (stored) sessionStorage.setItem(KEY, JSON.stringify(stored));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage disabled/full: keep the live result in React; never invent a fallback.
  }
}
