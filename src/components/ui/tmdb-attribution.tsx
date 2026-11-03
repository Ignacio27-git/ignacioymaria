import { cx } from "./cx";

/** The notice TMDB's terms require wherever its data or images are shown. */
export function TmdbAttribution({ className }: { className?: string }) {
  return (
    <p className={cx("max-w-prose text-sm text-ink-muted", className)}>
      Este producto usa la API de{" "}
      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-4"
      >
        TMDB
      </a>{" "}
      pero no está avalado ni certificado por TMDB.
    </p>
  );
}
