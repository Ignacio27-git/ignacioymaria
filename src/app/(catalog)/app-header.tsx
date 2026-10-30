"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, type SyntheticEvent } from "react";

import { signOutAction } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { ChevronDown } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { ThemePreference } from "@/lib/theme/preference";

const TABS = [
  { href: "/vistas", label: "Vistas" },
  { href: "/pendientes", label: "Pendientes" },
] as const;

/**
 * The catalog's header: the two list tabs and a menu (native popover) that
 * holds the theme choice and sign-out. Authenticated screens only; the layout
 * decides that.
 */
export function AppHeader({
  themePreference,
  personLabel,
}: {
  themePreference: ThemePreference;
  personLabel: string;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);

  // The browser already returns focus on Escape; this covers the engines and
  // test environments that do not, without pulling focus back from a click elsewhere.
  function onToggle(event: SyntheticEvent<HTMLDivElement>) {
    const { newState } = event.nativeEvent as Event & { newState?: string };
    if (newState !== "closed") return;
    const active = document.activeElement;
    const inside = active === document.body || event.currentTarget.contains(active);
    if (inside) trigger.current?.focus();
  }

  return (
    <header className="mx-auto flex w-full max-w-table items-center justify-between gap-2 px-4 pt-3 sm:px-6">
      <nav aria-label="Listas" className="flex">
        {TABS.map((tab) => {
          const current = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center border-b-2 px-3 font-condensed text-lg",
                "transition-colors duration-150 motion-reduce:transition-none",
                current
                  ? "border-ink font-extrabold text-ink"
                  : "border-transparent font-semibold text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div>
        <Button
          ref={trigger}
          variant="secondary"
          size="sm"
          popoverTarget={menuId}
          className="gap-2"
        >
          Menú
          <ChevronDown />
        </Button>
        <div
          id={menuId}
          popover="auto"
          onToggle={onToggle}
          // Top-layer: fixed to the viewport, so it is placed under the header
          // and, from md, kept inside the centred 760px column.
          className="fixed inset-auto right-4 top-16 m-0 w-[min(20rem,calc(100vw-2rem))] border-2 border-ink bg-paper p-4 text-ink md:right-[max(1rem,calc((100vw-47.5rem)/2+1.5rem))]"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">Sesión de {personLabel}</p>
            <ThemeToggle value={themePreference} />
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
