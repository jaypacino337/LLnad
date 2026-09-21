"use client";

import { useCallback, useEffect, useState } from "react";

import { timestamp, usd } from "@/lib/format";

interface PositionView {
  id: string;
  symbol: string;
  side: "long" | "short";
  marginUsd: number;
  leverage: number;
  entryPrice: number;
  markPrice: number | null;
  pnlUsd: number | null;
  liquidationPrice: number;
  priced: boolean;
  openedAt: string;
}

interface TradeView {
  id: string;
  symbol: string;
  side: "long" | "short";
  marginUsd: number;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  closedAt: string;
  reason: "closed" | "liquidated";
}

interface AccountView {
  wallet: string;
  balance: number;
  equity: number;
  positions: PositionView[];
  history: TradeView[];
  periods: Record<"daily" | "weekly" | "monthly", { key: string; return: number }>;
  heldAmount: number | null;
  rewardEligible: boolean;
}

function Money({ value, signed = false }: { value: number | null; signed?: boolean }) {
  if (value === null) return <span className="font-mono text-muted">—</span>;
  const tone = !signed ? "text-ink" : value >= 0 ? "text-mint-text" : "text-down";
  return (
    <span className={`font-mono tnum ${tone}`}>
      {signed && value >= 0 ? "+" : ""}
      {usd(value)}
    </span>
  );
}

/**
 * The signed-in player's live account: equity strip, open positions with
 * close buttons, recent trades. Polls while visible so liquidations and
 * period rollovers show up without a reload.
 */
export function AccountPanel({ full = false, signedIn }: { full?: boolean; signedIn: boolean }) {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [state, setState] = useState<"loading" | "signed-out" | "ready" | "error">(
    signedIn ? "loading" : "signed-out",
  );
  const [closing, setClosing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (response.status === 401) {
        setState("signed-out");
        return;
      }
      if (!response.ok) {
        setState("error");
        return;
      }
      const payload = (await response.json()) as { account: AccountView };
      setAccount(payload.account);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // The server told us we are signed out: nothing to fetch, no 401 noise.
    if (!signedIn) return;
    // Deferred a tick: effects synchronise with external systems, and the
    // fetch-then-setState belongs after paint, not during the effect body.
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30_000);
    const onChanged = () => refresh();
    window.addEventListener("hoodst:account-changed", onChanged);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("hoodst:account-changed", onChanged);
    };
  }, [refresh, signedIn]);

  async function close(positionId: string) {
    if (closing) return;
    setClosing(positionId);
    setNotice(null);
    try {
      const response = await fetch("/api/trade/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        trade?: TradeView;
      };
      if (!response.ok) {
        setNotice(payload.detail ?? "Close rejected.");
      } else if (payload.trade) {
        setNotice(
          `Closed $${payload.trade.symbol} at ${usd(payload.trade.exitPrice)} · PnL ${payload.trade.pnlUsd >= 0 ? "+" : ""}${usd(payload.trade.pnlUsd)}`,
        );
      }
      await refresh();
    } catch {
      setNotice("The network dropped out. Try again.");
    } finally {
      setClosing(null);
    }
  }

  if (state === "loading") {
    return <div className="skeleton h-24 rounded-xl" aria-hidden />;
  }
  if (state === "signed-out") {
    return (
      <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-[13px] text-muted">
        Connect a wallet (top right) to get your $10,000 paper balance.
      </p>
    );
  }
  if (state === "error" || !account) {
    return (
      <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-[13px] text-muted">
        Could not load your account. It retries automatically.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Equity strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
        {[
          { label: "Equity", value: <Money value={account.equity} /> },
          { label: "Free balance", value: <Money value={account.balance} /> },
          {
            label: "Today",
            value: (
              <span className={`font-mono tnum ${account.periods.daily.return >= 0 ? "text-mint-text" : "text-down"}`}>
                {(account.periods.daily.return * 100).toFixed(2)}%
              </span>
            ),
          },
          {
            label: "This week",
            value: (
              <span className={`font-mono tnum ${account.periods.weekly.return >= 0 ? "text-mint-text" : "text-down"}`}>
                {(account.periods.weekly.return * 100).toFixed(2)}%
              </span>
            ),
          },
          {
            label: "Rewards",
            value: account.rewardEligible ? (
              <span className="font-mono text-mint-text">eligible</span>
            ) : (
              <span className="font-mono text-muted">{account.heldAmount === null ? "—" : "not eligible"}</span>
            ),
          },
        ].map((cell) => (
          <div key={cell.label} className="bg-bg px-3.5 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{cell.label}</p>
            <p className="mt-1 text-[16px]">{cell.value}</p>
          </div>
        ))}
      </div>

      {notice ? (
        <p role="status" className="rounded-md bg-raised px-3 py-2 text-[12.5px] text-ink-soft">
          {notice}
        </p>
      ) : null}

      {/* Open positions */}
      <div className="overflow-hidden rounded-xl border border-line" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="border-b border-line bg-surface px-4 py-2.5">
          <h3 className="text-[13px] font-semibold text-ink">
            Open positions{" "}
            <span className="font-mono text-[11px] font-normal text-muted">
              {account.positions.length}
            </span>
          </h3>
        </div>
        {account.positions.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-muted">
            No open positions. Fills happen at the live indexed price.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {account.positions.map((position) => (
              <li key={position.id} className="row-in flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    position.side === "long" ? "bg-mint-wash text-mint-text" : "bg-down-wash text-down"
                  }`}
                >
                  {position.side} {position.leverage}x
                </span>
                <span className="min-w-[70px] text-[13px] font-medium text-ink">${position.symbol}</span>
                <span className="font-mono text-[11.5px] text-muted tnum">
                  in {usd(position.entryPrice)} → {position.priced ? usd(position.markPrice) : "unpriced"}
                </span>
                <span className="font-mono text-[11.5px] text-muted tnum">liq {usd(position.liquidationPrice)}</span>
                <span className="ml-auto text-[13px]">
                  <Money value={position.pnlUsd} signed />
                </span>
                <button
                  type="button"
                  onClick={() => close(position.id)}
                  disabled={closing === position.id || !position.priced}
                  title={position.priced ? "Close at the live price" : "No live price to close against"}
                  className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-muted transition hover:text-ink disabled:opacity-50"
                >
                  {closing === position.id ? "Closing…" : "Close"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* History */}
      {full ? (
        <div className="overflow-hidden rounded-xl border border-line" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="border-b border-line bg-surface px-4 py-2.5">
            <h3 className="text-[13px] font-semibold text-ink">Recent trades</h3>
          </div>
          {account.history.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-muted">No closed trades yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {account.history.map((trade) => (
                <li key={trade.id + trade.closedAt} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className="font-mono text-[11px] text-muted tnum">{timestamp(trade.closedAt)}</span>
                  <span className="text-[13px] font-medium text-ink">${trade.symbol}</span>
                  <span className="font-mono text-[11.5px] text-muted">
                    {trade.side} {trade.leverage}x · {usd(trade.entryPrice)} → {usd(trade.exitPrice)}
                  </span>
                  {trade.reason === "liquidated" ? (
                    <span className="rounded bg-down-wash px-1.5 py-0.5 text-[10.5px] font-semibold text-down">
                      liquidated
                    </span>
                  ) : null}
                  <span className="ml-auto text-[13px]">
                    <Money value={trade.pnlUsd} signed />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
