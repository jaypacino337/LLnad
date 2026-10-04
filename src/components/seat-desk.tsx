"use client";

import { useState } from "react";

import { CloneSprite } from "./sprite";
import { base58Encode, batchMessage, shortAddress, WALLET_SHAPE } from "@/lib/seats/shared";

/*
 * The claim desk. Adapted from memcoinz `preset-seats/components/seats/SeatDesk.tsx`
 * into CLONE's paper-and-cobalt windows. Inputs are a PUBLIC wallet address
 * and a public 𝕏 post link. Phantom is optional and only ever asked for its
 * public key (and, for the creator, a message signature). No key field exists.
 */

interface PhantomProvider {
  isPhantom?: boolean;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signMessage(message: Uint8Array, display?: "utf8"): Promise<{ signature: Uint8Array }>;
}

function phantom(): PhantomProvider | null {
  const w = window as unknown as { phantom?: { solana?: PhantomProvider }; solana?: PhantomProvider };
  const provider = w.phantom?.solana ?? w.solana;
  return provider?.isPhantom ? provider : null;
}

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | {
      state: "ready";
      phrase: string;
      seat: { label: string } | null;
      waitlist: number | null;
    }
  | { state: "error"; detail: string };

type Claim =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "seated"; label: string }
  | { state: "waitlisted"; position: number }
  | { state: "error"; detail: string };

const BUTTON =
  "press shrink-0 border border-ink bg-ink px-4 py-2.5 text-[13px] font-semibold text-bg transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40";
const GHOST =
  "press shrink-0 border border-line-strong bg-surface px-3 py-2 text-[12.5px] font-medium text-ink transition hover:border-ink disabled:opacity-40";
const INPUT =
  "w-full min-w-0 border border-line-strong bg-bg px-3 py-2.5 font-mono text-[12.5px] text-ink placeholder:text-muted/70";

function Step({ n, title, children, dim }: { n: number; title: string; children: React.ReactNode; dim?: boolean }) {
  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 transition-opacity ${dim ? "opacity-45" : ""}`}>
      <span className="grid size-6 place-items-center border border-line-strong bg-raised font-mono text-[11px] text-ink-soft">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}

export function SeatDesk({ symbol }: { symbol: string }) {
  const [wallet, setWallet] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [postUrl, setPostUrl] = useState("");
  const [claim, setClaim] = useState<Claim>({ state: "idle" });
  const [copied, setCopied] = useState(false);

  const trimmed = wallet.trim();
  const valid = WALLET_SHAPE.test(trimmed);

  async function load(address: string) {
    setLookup({ state: "loading" });
    setClaim({ state: "idle" });
    try {
      const res = await fetch(`/api/seats?wallet=${encodeURIComponent(address)}`, { cache: "no-store" });
      const json = (await res.json()) as {
        error?: string;
        phrase?: string;
        you?: { seat: { label: string } | null; waitlist: number | null };
      };
      if (!res.ok || !json.phrase) {
        setLookup({ state: "error", detail: json.error ?? "Couldn't load your phrase. Try again." });
        return;
      }
      setLookup({ state: "ready", phrase: json.phrase, seat: json.you?.seat ?? null, waitlist: json.you?.waitlist ?? null });
    } catch {
      setLookup({ state: "error", detail: "The network dropped out. Try again." });
    }
  }

  async function connect() {
    const provider = phantom();
    if (!provider) {
      setLookup({ state: "error", detail: "Phantom isn't installed here. Paste your public wallet address instead." });
      return;
    }
    try {
      const { publicKey } = await provider.connect();
      const address = publicKey.toString();
      setWallet(address);
      void load(address);
    } catch {
      setLookup({ state: "error", detail: "Connection was cancelled." });
    }
  }

  async function submit() {
    setClaim({ state: "sending" });
    try {
      const res = await fetch("/api/seats/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: trimmed, postUrl: postUrl.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: "seated" | "waitlisted";
        label?: string;
        position?: number;
      };
      if (!res.ok || !json.status) {
        setClaim({ state: "error", detail: json.error ?? "That didn't work. Try again." });
      } else if (json.status === "seated") {
        setClaim({ state: "seated", label: json.label ?? "" });
      } else {
        setClaim({ state: "waitlisted", position: json.position ?? 0 });
      }
    } catch {
      setClaim({ state: "error", detail: "The network dropped out. Try again." });
    }
  }

  const ready = lookup.state === "ready" ? lookup : null;
  const alreadyIn = ready?.seat || ready?.waitlist;

  return (
    <ol className="space-y-6">
      <Step n={1} title="Your wallet (public address)">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) void load(trimmed);
          }}
        >
          <label htmlFor="seat-wallet" className="sr-only">
            Solana wallet address
          </label>
          <input
            id="seat-wallet"
            value={wallet}
            onChange={(event) => {
              setWallet(event.target.value);
              setLookup({ state: "idle" });
              setClaim({ state: "idle" });
            }}
            placeholder="your Solana address"
            spellCheck={false}
            autoComplete="off"
            className={INPUT}
          />
          <button type="submit" className={BUTTON} disabled={!valid || lookup.state === "loading"}>
            {lookup.state === "loading" ? "Checking…" : "Get my phrase"}
          </button>
          <button type="button" className={GHOST} onClick={() => void connect()}>
            Use Phantom
          </button>
        </form>
        {trimmed && !valid ? (
          <p className="mt-1.5 text-[11.5px] text-muted">That is not shaped like a Solana address yet.</p>
        ) : null}
        {lookup.state === "error" ? <p className="mt-2 text-[12px] text-down">{lookup.detail}</p> : null}
        {valid ? (
          <div className="row-in mt-3 flex items-center gap-3 border border-dashed border-line-strong bg-bg px-3 py-2">
            <CloneSprite mint={trimmed} size={36} />
            <p className="text-[11.5px] leading-relaxed text-muted">
              Your resident clone. Same body for this wallet, forever.
            </p>
          </div>
        ) : null}
      </Step>

      <Step n={2} title={`Post your phrase on 𝕏`} dim={!ready}>
        {ready ? (
          alreadyIn ? (
            <p className="row-in text-[12.5px] text-ink">
              {ready.seat
                ? `You already hold seat ${ready.seat.label}. Your clone lives in the city.`
                : `You're #${ready.waitlist} on the waitlist. A seat opens when someone sells or a batch opens.`}
            </p>
          ) : (
            <div className="row-in space-y-2">
              <p className="break-words border border-line-strong bg-bg px-3 py-2.5 font-mono text-[12.5px] text-ink">
                {ready.phrase}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={GHOST}
                  onClick={() => {
                    void navigator.clipboard?.writeText(ready.phrase).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    });
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  className={GHOST}
                  href={`https://x.com/intent/post?text=${encodeURIComponent(ready.phrase)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Post on 𝕏 ↗
                </a>
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted">
                The 8-character code is derived from this wallet, so the post only works for you. Keep
                the post public until you&apos;re seated.
              </p>
            </div>
          )
        ) : (
          <p className="text-[12px] text-muted">Your personal phrase appears after step 1.</p>
        )}
      </Step>

      <Step n={3} title="Paste the post link" dim={!ready || !!alreadyIn}>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready && postUrl.trim()) void submit();
          }}
        >
          <label htmlFor="seat-post" className="sr-only">
            Link to your post
          </label>
          <input
            id="seat-post"
            value={postUrl}
            onChange={(event) => setPostUrl(event.target.value)}
            placeholder="https://x.com/you/status/…"
            spellCheck={false}
            autoComplete="off"
            disabled={!ready || !!alreadyIn}
            className={INPUT}
          />
          <button
            type="submit"
            className={BUTTON}
            disabled={!ready || !!alreadyIn || !postUrl.trim() || claim.state === "sending"}
          >
            {claim.state === "sending" ? "Reading post…" : "Claim seat"}
          </button>
        </form>
        {claim.state === "error" ? <p className="mt-2 text-[12px] text-down">{claim.detail}</p> : null}
        {claim.state === "seated" ? (
          <div className="row-in mt-3 flex items-center gap-3 border border-up/40 bg-up-wash px-3 py-2.5">
            <CloneSprite mint={trimmed} size={40} className="hop" />
            <p className="text-[12.5px] text-ink">
              Seat <span className="font-mono font-semibold">{claim.label}</span> is yours. Your clone
              just moved in. Hold ${symbol} to keep it.
            </p>
          </div>
        ) : null}
        {claim.state === "waitlisted" ? (
          <p className="row-in mt-3 border border-line-strong bg-raised px-3 py-2.5 text-[12.5px] text-ink">
            The city is full right now: you&apos;re <span className="font-mono">#{claim.position}</span> on the
            waitlist, in post order.
          </p>
        ) : null}
      </Step>
    </ol>
  );
}

/** "Sell it, lose it" check. Permissionless; the server reads balances from chain. */
export function SweepButton() {
  const [state, setState] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  async function run() {
    setState({ busy: true, note: null });
    try {
      const res = await fetch("/api/seats/sweep", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        skipped?: boolean;
        retryInMs?: number;
        freed?: unknown[];
        promoted?: unknown[];
        checked?: number;
      };
      if (!res.ok) setState({ busy: false, note: json.error ?? "Check failed." });
      else if (json.skipped) setState({ busy: false, note: `Checked recently. Try again in ${Math.ceil((json.retryInMs ?? 0) / 1000)}s.` });
      else
        setState({
          busy: false,
          note: `Checked ${json.checked ?? 0} wallets on chain: ${json.freed?.length ?? 0} freed, ${json.promoted?.length ?? 0} promoted. Reload to see the new list.`,
        });
    } catch {
      setState({ busy: false, note: "The network dropped out." });
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={GHOST} disabled={state.busy} onClick={() => void run()}>
        {state.busy ? "Reading chain…" : "Check seats now"}
      </button>
      {state.note ? <p className="text-[11.5px] text-muted">{state.note}</p> : null}
    </div>
  );
}

/** Creator-only: schedule a batch of new seats, authorised by a wallet signature. */
export function BatchPanel({ mint, creator }: { mint: string; creator: string }) {
  const [count, setCount] = useState("50");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    setNote(null);
    const provider = phantom();
    if (!provider) {
      setNote({ tone: "bad", text: "Open this page in a browser with Phantom to sign." });
      return;
    }
    const n = Number(count);
    const openAt = when ? new Date(when).getTime() : Date.now();
    if (!Number.isInteger(n) || n < 1 || !Number.isFinite(openAt)) {
      setNote({ tone: "bad", text: "Pick a whole number of seats and a valid time." });
      return;
    }
    setBusy(true);
    try {
      const { publicKey } = await provider.connect();
      if (publicKey.toString() !== creator) {
        setNote({ tone: "bad", text: `Connected ${shortAddress(publicKey.toString())}; only the creator ${shortAddress(creator)} can open seats.` });
        return;
      }
      const message = new TextEncoder().encode(batchMessage(mint, n, openAt));
      const { signature } = await provider.signMessage(message, "utf8");
      const res = await fetch("/api/seats/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count: n, openAt, signature: base58Encode(signature) }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setNote(
        res.ok
          ? { tone: "ok", text: `Scheduled ${n} seats for ${new Date(openAt).toLocaleString()}.` }
          : { tone: "bad", text: json.error ?? "Rejected." },
      );
    } catch {
      setNote({ tone: "bad", text: "Signing was cancelled." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted hover:text-ink">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span> creator: open more seats
      </summary>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Seats
          <input type="number" min={1} max={10000} value={count} onChange={(e) => setCount(e.target.value)} className={`${INPUT} sm:w-28`} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Opens at (blank = now)
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={INPUT} />
        </label>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => void open()}>
          {busy ? "Waiting for wallet…" : "Sign & schedule"}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Phantom signs a plain-text message; only the signature is sent. Nothing can move funds.
      </p>
      {note ? <p className={`mt-2 text-[12px] ${note.tone === "ok" ? "text-up" : "text-down"}`}>{note.text}</p> : null}
    </details>
  );
}
