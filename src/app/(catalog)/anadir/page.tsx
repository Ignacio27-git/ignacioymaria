import type { Metadata } from "next";

import { AddScreen } from "./add-screen";

export const metadata: Metadata = { title: "Añadir · Ignacio y María" };

export default function AddPage({ searchParams }: PageProps<"/anadir">) {
  return <AddScreen searchParams={searchParams} />;
}
