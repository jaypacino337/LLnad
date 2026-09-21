import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AccountPanel } from "@/components/account-panel";
import { SESSION_COOKIE, verifySession } from "@/lib/player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Your paper balance, open positions and trade history.",
};

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const signedIn = verifySession(cookieStore.get(SESSION_COOKIE)?.value) !== null;
  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Portfolio</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Marked to live prices on every refresh. Liquidations settle automatically the moment losses
        reach the margin behind a position.
      </p>

      <div className="mt-7">
        <AccountPanel full signedIn={signedIn} />
      </div>
    </div>
  );
}
