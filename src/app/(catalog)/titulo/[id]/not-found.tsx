import Link from "next/link";

import { Masthead } from "@/components/ui/masthead";

/** Shown for an unknown or malformed title id, and after another device deleted it. */
export default function TitleNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-table flex-1 flex-col items-start gap-6 px-4 pb-16 pt-6 sm:px-6">
      <Masthead title="No encontrado" as="h1" className="w-full" />
      <p>Este título no existe o ya se eliminó.</p>
      <Link
        href="/vistas"
        className="inline-flex min-h-11 items-center underline underline-offset-4"
      >
        Volver a Vistas
      </Link>
    </main>
  );
}
