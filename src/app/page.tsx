import { Suspense } from "react";

import { signOutAction } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Masthead } from "@/components/ui/masthead";

import { PersonGate } from "./person-gate";
import { ThemeSection } from "./theme-section";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-table flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <Masthead title="Ignacio y María" as="h1" />
      <Suspense fallback={null}>
        <PersonGate />
      </Suspense>
      <Suspense fallback={null}>
        <ThemeSection />
      </Suspense>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Salir
        </Button>
      </form>
    </main>
  );
}
