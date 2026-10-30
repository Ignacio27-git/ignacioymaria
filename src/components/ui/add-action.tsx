import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

import { cx } from "./cx";
import { PlusMark } from "./icons";

export type AddActionProps = { className?: string } & (
  | { href: string; onClick?: undefined }
  | { href?: undefined; onClick?: MouseEventHandler<HTMLButtonElement> }
);

// Fixed to the bottom, inside the thumb's reach and clear of the home indicator.
// The full-width wrapper ignores pointer events; its inner track is as wide as
// the centred 760px column, so from the desktop breakpoint the action hugs the
// column's right edge instead of the viewport's (DS-1, D-67). Same ruled look
// as the primary Button (never inverted, R4), with a soft shadow because it
// floats over scrolling rows.
const WRAPPER =
  "pointer-events-none fixed inset-x-0 z-20 bottom-[max(1rem,env(safe-area-inset-bottom))]";
const TRACK =
  "mx-auto flex max-w-table justify-end px-[max(1rem,env(safe-area-inset-right))] md:px-[env(safe-area-inset-right)]";
const LOOK = [
  "pointer-events-auto",
  "inline-flex min-h-12 items-center justify-center gap-2 px-4",
  "border-2 border-b-4 border-ink bg-paper font-condensed text-lg font-bold text-ink",
  "shadow-[0_6px_16px_rgb(0_0_0/0.22)]",
  "transition-[transform,background-color] duration-150 ease-out",
  "hover:bg-surface active:scale-[0.98] motion-reduce:transition-none",
].join(" ");

function Anchored({ children }: { children: ReactNode }) {
  return (
    <div className={WRAPPER}>
      <div className={TRACK}>{children}</div>
    </div>
  );
}

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
      <Anchored>
        <Link href={href} className={cx(LOOK, className)}>
          {content}
        </Link>
      </Anchored>
    );
  }
  return (
    <Anchored>
      <button type="button" onClick={onClick} className={cx(LOOK, className)}>
        {content}
      </button>
    </Anchored>
  );
}
