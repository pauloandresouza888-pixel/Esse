/**
 * ID helpers. Browser `crypto.randomUUID` is not available over plain HTTP on
 * some mobile browsers, so we fall back to a timestamp + random suffix.
 */
export function createId(prefix: string, existing?: () => string): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID().slice(0, 8)}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return existing ? existing() : `${prefix}-${random}`;
}

const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 8 characters from an unambiguous alphabet (no 0/O, 1/I). */
export function createFriendCode(): string {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += FRIEND_CODE_ALPHABET[Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length)];
  }
  return code;
}

export function isValidFriendCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code.toUpperCase());
}
