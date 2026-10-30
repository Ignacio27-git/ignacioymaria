import { Suspense, type ReactNode } from "react";

import { CatalogShell } from "./catalog-shell";

/** Everything signed-in users see: the guard, the header and the page. */
export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <CatalogShell>{children}</CatalogShell>
    </Suspense>
  );
}
