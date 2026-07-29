"use client";

import { useState } from "react";

import { DEFAULT_COLOR, DEFAULT_GLYPH, GLYPHS, PLOT_COLORS } from "@/lib/palette";
import type { FieldErrors, Plot } from "@/lib/types";
import { LIMITS } from "@/lib/validate";

interface ClaimFormProps {
  coord: string;
  onClaimed: (plot: Plot) => void;
}

const FIELD_CLASS =
  "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent";

export function ClaimForm({ coord, onClaimed }: ClaimFormProps) {
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [bio, setBio] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [glyph, setGlyph] = useState<string>(DEFAULT_GLYPH);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrors({});
    setMessage(null);

    try {
      const response = await fetch("/api/plots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coord, title, handle, url, bio, color, glyph }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        plot?: Plot;
        message?: string;
        fields?: FieldErrors;
      };

      if (!response.ok) {
        setErrors(payload.fields ?? {});
        setMessage(payload.message ?? "That claim could not be recorded.");
        return;
      }

      if (payload.plot) onClaimed(payload.plot);
    } catch {
      setMessage("The network dropped out. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="claim-title" className="block text-xs font-medium text-muted">
          Plot name
        </label>
        <input
          id="claim-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={LIMITS.title}
          required
          autoComplete="off"
          placeholder="The Forge"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "claim-title-error" : undefined}
          className={`mt-1.5 ${FIELD_CLASS}`}
        />
        {errors.title ? (
          <p id="claim-title-error" className="mt-1 text-xs text-accent">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="claim-handle" className="block text-xs font-medium text-muted">
          Your handle
        </label>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span aria-hidden className="font-mono text-sm text-muted">
            @
          </span>
          <input
            id="claim-handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            maxLength={LIMITS.handle}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="tulla"
            aria-invalid={Boolean(errors.handle)}
            aria-describedby={errors.handle ? "claim-handle-error" : undefined}
            className={FIELD_CLASS}
          />
        </div>
        {errors.handle ? (
          <p id="claim-handle-error" className="mt-1 text-xs text-accent">
            {errors.handle}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="claim-url" className="block text-xs font-medium text-muted">
          Link <span className="font-normal">(optional)</span>
        </label>
        <input
          id="claim-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={LIMITS.url}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="yoursite.com"
          aria-invalid={Boolean(errors.url)}
          aria-describedby={errors.url ? "claim-url-error" : undefined}
          className={`mt-1.5 ${FIELD_CLASS}`}
        />
        {errors.url ? (
          <p id="claim-url-error" className="mt-1 text-xs text-accent">
            {errors.url}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="claim-bio" className="block text-xs font-medium text-muted">
          What is here? <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="claim-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={LIMITS.bio}
          rows={3}
          placeholder="Small tools, sharpened weekly."
          aria-invalid={Boolean(errors.bio)}
          aria-describedby="claim-bio-count"
          className={`mt-1.5 resize-none ${FIELD_CLASS}`}
        />
        <p id="claim-bio-count" className="mt-1 text-right font-mono text-[11px] text-muted">
          {bio.length}/{LIMITS.bio}
        </p>
        {errors.bio ? <p className="text-xs text-accent">{errors.bio}</p> : null}
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Recording…" : `Claim ${coord}`}
      </button>

      <p className="text-[11px] leading-relaxed text-muted">
        Claims are public and permanent. Do not put anything here you would not put on a signpost.
      </p>
    </form>
  );
}
