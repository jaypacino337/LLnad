"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { shortAddress } from "@/lib/format";

/**
 * Wallet sign-in via the injected Phantom-style provider. Signs a timestamped
 * message; the server verifies the signature and sets the session cookie.
 * Never asks for — and has no field for — a private key.
 */

interface SolanaProvider {
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (message: Uint8Array, encoding: "utf8") => Promise<{ signature: Uint8Array }>;
}

function getProvider(): SolanaProvider | null {
  const candidate = (window as unknown as { solana?: Partial<SolanaProvider> }).solana;
  if (typeof candidate?.connect === "function" && typeof candidate.signMessage === "function") {
    return candidate as SolanaProvider;
  }
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function WalletButton({ wallet }: { wallet: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const provider = getProvider();
      if (!provider) {
        setMessage("No Solana wallet found — install Phantom, then retry.");
        return;
      }
      const { publicKey } = await provider.connect();
      const address = publicKey.toString();
      const timestampMs = Date.now();
      // Must match signInMessage() on the server byte for byte.
      const text = `Hood ST sign-in\nwallet: ${address}\nts: ${timestampMs}`;
      const signed = await provider.signMessage(new TextEncoder().encode(text), "utf8");

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          timestampMs,
          signatureBase64: toBase64(signed.signature),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) {
        setMessage(payload.detail ?? "Sign-in failed.");
        return;
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The wallet declined.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  if (wallet) {
    return (
      <span className="flex items-center gap-2">
        <span className="hidden rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[11.5px] text-ink sm:inline">
          {shortAddress(wallet)}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="rounded-md border border-line px-2.5 py-1.5 text-[12px] text-muted transition hover:text-ink"
        >
          Sign out
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-bg transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Connect wallet"}
      </button>
      {message ? <span className="hidden text-[11px] text-muted lg:inline">{message}</span> : null}
    </span>
  );
}
