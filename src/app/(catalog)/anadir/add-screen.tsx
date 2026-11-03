import Link from "next/link";

import { Masthead } from "@/components/ui/masthead";
import { parseAddOrigin } from "@/lib/titles/add-origin";
import type { RawSearchParams } from "@/lib/titles/list-params";

import { AddForm } from "./add-form";

const LIST_NAMES = { vistas: "Vistas", pendientes: "Pendientes" } as const;

/**
 * The add screen. `?desde=` is the list the user came from and sets the new
 * title's state (A1). The search params are read here, not in the page, so the
 * page itself prerenders and only this part waits for the request.
 */
export async function AddScreen({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const origin = parseAddOrigin((await searchParams).desde);

  return (
    <main className="mx-auto flex w-full max-w-table flex-1 flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <Link
        href={`/${origin}`}
        className="inline-flex min-h-11 items-center self-start underline underline-offset-4"
      >
        Volver a {LIST_NAMES[origin]}
      </Link>
      <Masthead title="Añadir" as="h1" />
      <AddForm desde={origin} />
    </main>
  );
}
