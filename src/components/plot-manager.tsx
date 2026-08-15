"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CopyField } from "@/components/copy-field";
import { DEFAULT_COLOR, DEFAULT_GLYPH, GLYPHS, PLOT_COLORS } from "@/lib/palette";
import type { FieldErrors, Plot } from "@/lib/types";
import { LIMITS } from "@/lib/validate";

const FIELD_CLASS =
  "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent";

type Mode = "closed" | "open";

/**
 * Ownership without accounts: the settler proves it by pasting the key they
 * were given when they claimed. The key is only ever sent in a header.
 */
export function PlotManager({ plot }: { plot: Plot }) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("closed");
  const [claimKey, setClaimKey] = useState("");

  const [title, setTitle] = useState(plot.title);
  const [url, setUrl] = useState(plot.url ?? "");
  const [bio, setBio] = useState(plot.bio ?? "");
  const [color, setColor] = useState(plot.color || DEFAULT_COLOR);
  const [glyph, setGlyph] = useState<string>(plot.glyph || DEFAULT_GLYPH);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setErrors({});
    setMessage(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/plots/${plot.coord}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-claim-key": claimKey },
        body: JSON.stringify({ title, url, bio, color, glyph }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        fields?: FieldErrors;
      };

      if (!response.ok) {
        setErrors(payload.fields ?? {});
        setMessage(payload.message ?? "That change could not be saved.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setMessage("The network dropped out. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/plots/${plot.coord}`, {
        method: "DELETE",
        headers: { "x-claim-key": claimKey },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "That plot could not be released.");
        return;
      }

      // Refreshing in place would leave the page describing a plot that no
      // longer exists, so hand the settler to the map with the square selected
      // and already empty — the clearest possible confirmation.
      router.replace(`/map?plot=${plot.coord}`);
      router.refresh();
    } catch {
      setMessage("The network dropped out. Try again.");
    } finally {
      setBusy(false);
      setConfirmingRelease(false);
    }
  }

  if (mode === "closed") {
    return (
      <section className="mt-16 border-t border-line pt-8">
        <button
          type="button"
          onClick={() => setMode("open")}
          className="text-sm text-muted transition hover:text-ink"
        >
          Hold the key to this plot? Manage it →
        </button>
      </section>
    );
  }

  return (
    <section className="mt-16 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-ink">Manage {plot.coord}</h2>
        <button
          type="button"
          onClick={() => setMode("closed")}
          className="text-xs text-muted transition hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="manage-key" className="block text-xs font-medium text-muted">
          Claim key
        </label>
        <input
          id="manage-key"
          value={claimKey}
          onChange={(event) => setClaimKey(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="The key you saved when you claimed this plot"
          className={`mt-1.5 font-mono ${FIELD_CLASS}`}
        />
        <p className="mt-1.5 text-xs text-muted">
          Founding plots have no key and cannot be edited.
        </p>
      </div>

      <form onSubmit={save} className="mt-6 space-y-4 border-t border-line pt-6" noValidate>
        <div>
          <label htmlFor="manage-title" className="block text-xs font-medium text-muted">
            Plot name
          </label>
          <input
            id="manage-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={LIMITS.title}
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
          {errors.title ? <p className="mt-1 text-xs text-accent">{errors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="manage-url" className="block text-xs font-medium text-muted">
            Link
          </label>
          <input
            id="manage-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={LIMITS.url}
            inputMode="url"
            spellCheck={false}
            placeholder="yoursite.com"
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
          {errors.url ? <p className="mt-1 text-xs text-accent">{errors.url}</p> : null}
        </div>

        <div>
          <label htmlFor="manage-bio" className="block text-xs font-medium text-muted">
            What is here?
          </label>
          <textarea
            id="manage-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={LIMITS.bio}
            rows={3}
            className={`mt-1.5 resize-none ${FIELD_CLASS}`}
          />
          {errors.bio ? <p className="mt-1 text-xs text-accent">{errors.bio}</p> : null}
        </div>

        <fieldset>
          <legend className="text-xs font-medium text-muted">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLOT_COLORS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setColor(option.key)}
                aria-pressed={color === option.key}
                title={option.label}
                className={`size-7 rounded-md border-2 transition ${
                  color === option.key ? "border-ink" : "border-transparent hover:border-line-strong"
                }`}
                style={{ backgroundColor: option.hex }}
              >
                <span className="sr-only">{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-muted">Mark</legend>
          <div className="mt-2 grid grid-cols-8 gap-1.5">
            {GLYPHS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGlyph(option)}
                aria-pressed={glyph === option}
                className={`grid aspect-square place-items-center rounded-md border font-mono text-sm transition ${
                  glyph === option
                    ? "border-accent bg-raised text-ink"
                    : "border-line text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        {message ? (
          <p role="alert" className="rounded-md border border-accent/40 bg-raised px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}

        {saved ? (
          <p role="status" className="rounded-md border border-line bg-raised px-3 py-2 text-sm">
            Saved. The map and the register are up to date.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !claimKey}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>

          {confirmingRelease ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Give up {plot.coord}?</span>
              <button
                type="button"
                onClick={release}
                disabled={busy}
                className="rounded-md border border-accent px-3 py-2 text-xs font-semibold text-accent disabled:opacity-50"
              >
                Yes, release it
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRelease(false)}
                className="text-xs text-muted hover:text-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRelease(true)}
              disabled={!claimKey}
              className="text-sm text-muted transition hover:text-ink disabled:opacity-50"
            >
              Release this plot
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-xs text-muted">Address to share</p>
        <div className="mt-2">
          <CopyField value={plot.coord} label={`Address ${plot.coord}`} />
        </div>
      </div>
    </section>
  );
}
