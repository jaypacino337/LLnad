"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Phantom-style wallet verification. Uses the injected `window.solana`
 * provider directly — no wallet-adapter dependency — and degrades to a clear
 * message when no wallet extension is present.
 */

interface SolanaProvider {
  isPhantom?: boolean;
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

export function ProUnlock({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const provider = getProvider();
      if (!provider) {
        setMessage("No Solana wallet extension detected. Install Phantom, then retry.");
        return;
      }

      const { publicKey } = await provider.connect();
      const wallet = publicKey.toString();
      const timestampMs = Date.now();
      // Must match proMessage() on the server byte for byte.
      const text = `PumpXBT Pro verification\nwallet: ${wallet}\nts: ${timestampMs}`;
      const signed = await provider.signMessage(new TextEncoder().encode(text), "utf8");

      const response = await fetch("/api/pro/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, timestampMs, signatureBase64: toBase64(signed.signature) }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        unlocked?: boolean;
        detail?: string;
        error?: string;
      };

      if (!response.ok || !payload.unlocked) {
        setMessage(payload.detail ?? payload.error ?? "Verification failed.");
        return;
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The wallet declined or the network dropped.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={verify}
        disabled={busy}
        className="rounded-md bg-mint-strong px-4 py-2 text-[13px] font-semibold text-mint-ink transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Verifying…" : "Connect wallet & verify"}
      </button>
      {message ? (
        <p role="alert" className="text-[12px] text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
