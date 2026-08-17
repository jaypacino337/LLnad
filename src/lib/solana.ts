import { createPublicKey, verify as cryptoVerify } from "node:crypto";

/**
 * Minimal Solana plumbing with zero dependencies: base58, ed25519 signature
 * verification, and a JSON-RPC helper. Enough to verify a holder and read
 * balances without pulling in web3.js.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP = new Map([...ALPHABET].map((char, index) => [char, index]));

export function base58Decode(input: string): Uint8Array {
  if (input.length === 0) return new Uint8Array(0);
  // Accumulator starts empty: seeding it with [0] would double-count the zero
  // bytes that leading "1"s already encode.
  const bytes: number[] = [];
  for (const char of input) {
    const value = ALPHABET_MAP.get(char);
    if (value === undefined) throw new Error(`invalid base58 character "${char}"`);
    let carry = value;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading "1"s encode leading zero bytes.
  for (const char of input) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

export function base58Encode(input: Uint8Array): string {
  if (input.length === 0) return "";
  const digits: number[] = [];
  for (const byte of input) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let output = "";
  for (const byte of input) {
    if (byte !== 0) break;
    output += "1";
  }
  for (let i = digits.length - 1; i >= 0; i -= 1) output += ALPHABET[digits[i]];
  return output;
}

/** SPKI DER prefix for a raw ed25519 public key. */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** Verifies an ed25519 signature against a base58 Solana public key. */
export function verifySolanaSignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKeyBase58: string,
): boolean {
  try {
    const raw = base58Decode(publicKeyBase58);
    if (raw.length !== 32 || signature.length !== 64) return false;
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(raw)]),
      format: "der",
      type: "spki",
    });
    return cryptoVerify(null, Buffer.from(message), key, Buffer.from(signature));
  } catch {
    return false;
  }
}

interface RpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

/** One JSON-RPC call with a hard timeout. Throws on transport or RPC error. */
export async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(9_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`rpc ${method} responded ${response.status}`);
  const payload = (await response.json()) as RpcResponse<T>;
  if (payload.error) throw new Error(`rpc ${method}: ${payload.error.message}`);
  if (payload.result === undefined) throw new Error(`rpc ${method}: empty result`);
  return payload.result;
}

/** Sum of an owner's balance for one mint, in UI units. */
export async function getTokenBalance(
  rpcUrl: string,
  owner: string,
  mint: string,
): Promise<number> {
  interface TokenAccounts {
    value: Array<{
      account: {
        data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } };
      };
    }>;
  }
  const result = await rpc<TokenAccounts>(rpcUrl, "getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed" },
  ]);
  return result.value.reduce(
    (sum, entry) => sum + (entry.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
    0,
  );
}
