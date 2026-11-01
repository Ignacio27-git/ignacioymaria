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
  className,
}: {
  /** Stored TMDB poster path, or null for the neutral placeholder. */
  path: string | null;
  name: string;
  /** The name is written next to the poster: hide the image from assistive tech. */
  decorative?: boolean;
  className?: string;
}) {
  const url = posterUrl(path);
  const box = cx(
    "relative block aspect-[2/3] shrink-0 overflow-hidden border border-rule bg-surface",
    className,
  );

  if (url === null) {
    return decorative ? (
      <span aria-hidden="true" className={box} />
    ) : (
      <span role="img" aria-label={`Sin póster de ${name}`} className={box} />
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
