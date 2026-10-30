import Link from "next/link";
import type { MouseEventHandler } from "react";

import { cx } from "./cx";
import { PlusMark } from "./icons";

export type AddActionProps = { className?: string } & (
  | { href: string; onClick?: undefined }
  | { href?: undefined; onClick?: MouseEventHandler<HTMLButtonElement> }
);

// Fixed to the bottom right corner, inside the thumb's reach and clear of the
// home indicator. Same ruled look as the primary Button (never inverted, R4),
// with a soft shadow because it floats over scrolling rows.
const LOOK = [
  "fixed z-20 right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
  "inline-flex min-h-12 items-center justify-center gap-2 px-4",
  "border-2 border-b-4 border-ink bg-paper font-condensed text-lg font-bold text-ink",
  "shadow-[0_6px_16px_rgb(0_0_0/0.22)]",
  "transition-[transform,background-color] duration-150 ease-out",
  "hover:bg-surface active:scale-[0.98] motion-reduce:transition-none",
].join(" ");

/** The page's one primary action: "Añadir" a title. A link or a button by props. */
export function AddAction({ href, onClick, className }: AddActionProps) {
  const content = (
    <>
      <PlusMark />
      Añadir
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} className={cx(LOOK, className)}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cx(LOOK, className)}>
      {content}
    </button>
  );
}
