import { Suspense } from "react";

import { signOutAction } from "@/app/_actions/auth";

import { PersonGate } from "./person-gate";

export default function Home() {
  return (
    <main>
      <h1>Ignacio y María</h1>
      <Suspense fallback={null}>
        <PersonGate />
      </Suspense>
      <form action={signOutAction}>
        <button type="submit">Salir</button>
      </form>
    </main>
  );
}
