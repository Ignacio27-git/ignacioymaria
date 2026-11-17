import Image from "next/image";

import { posterUrl } from "@/lib/tmdb/poster-url";

import { cx } from "./cx";

const WIDTH = 342;
const HEIGHT = 513;

/**
 * A TMDB poster in a fixed 2:3 box, so the layout never shifts whether the
 * image is there, still loading or missing. The width comes from the caller.
 * TMDB already serves w342, so Next's optimizer is skipped (D-64).
 */
export function Poster({
  path,
  name,
  decorative = false,
  fallback = "empty",
  className,
}: {
  /** Stored TMDB poster path, or null for the neutral placeholder. */
  path: string | null;
  name: string;
  /** The name is written next to the poster: hide the image from assistive tech. */
  decorative?: boolean;
  /**
   * What fills the box when there is no poster: nothing ("empty", the default
   * every existing caller keeps) or the title in large condensed type.
   */
  fallback?: "empty" | "title";
  className?: string;
}) {
  const url = posterUrl(path);
  const box = cx(
    "relative block aspect-[2/3] shrink-0 overflow-hidden border border-rule bg-surface",
    className,
  );

  if (url === null) {
    const content =
      fallback === "title" ? (
        <span className="absolute inset-0 line-clamp-6 p-2 font-condensed text-2xl font-extrabold leading-[1.1] [overflow-wrap:anywhere]">
          {name}
        </span>
      ) : null;

    return decorative ? (
      <span aria-hidden="true" className={box}>
        {content}
      </span>
    ) : (
      <span role="img" aria-label={`Sin póster de ${name}`} className={box}>
        {content}
      </span>
    );
  }

  return (
    <span className={box}>
      <Image
        src={url}
        alt={decorative ? "" : `Póster de ${name}`}
        width={WIDTH}
        height={HEIGHT}
        unoptimized
        className="size-full object-cover"
      />
    </span>
  );
}
