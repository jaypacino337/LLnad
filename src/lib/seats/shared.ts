/**
 * Seat helpers safe for the browser (no node:crypto, no Buffer). The server
 * rules in ./core re-export these so client and server build identical
 * strings. Sources: memcoinz `preset-seats/lib/seats.ts` (seatLabel,
 * batchMessage) and `preset-seats/lib/b58.ts` (base58).
 */

/** Airline-style seat label for the nth seat (0-based): 1A..1F, 2A.. */
export const seatLabel = (n: number) => `${Math.floor(n / 6) + 1}${"ABCDEF"[n % 6]}`;

/** What the creator signs to open a batch (built identically on client and server). */
export const batchMessage = (mint: string, count: number, openAt: number) =>
  `Open ${count} seats on ${mint} at ${new Date(openAt).toISOString()}`;

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Browser-safe base58 encode (signatures from Phantom's signMessage). */
export function base58Encode(bytes: Uint8Array): string {
  let n = BigInt(0);
  for (const b of bytes) n = (n << BigInt(8)) | BigInt(b);
  let out = "";
  while (n > BigInt(0)) {
    out = B58[Number(n % BigInt(58))] + out;
    n /= BigInt(58);
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

export const WALLET_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const shortAddress = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;
