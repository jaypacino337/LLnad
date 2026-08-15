"use client";

const STORAGE_KEY = "solanda-theme";

/**
 * Stateless on purpose. Which icon shows is decided by CSS from the
 * `data-theme` attribute on <html>, so the button is correct on the very first
 * paint — before hydration — and there is no server/client mismatch to reconcile.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing: the choice just will not stick between visits.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between the light and dark map"
      title="Switch between the light and dark map"
      className="grid size-9 place-items-center rounded-md border border-line bg-surface text-muted transition hover:border-line-strong hover:text-ink"
    >
      <span aria-hidden className="theme-icon theme-icon-dark text-base leading-none">
        ☀
      </span>
      <span aria-hidden className="theme-icon theme-icon-light text-base leading-none">
        ☾
      </span>
    </button>
  );
}
