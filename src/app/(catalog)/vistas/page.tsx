import type { Metadata } from "next";

import { TitlesList } from "../titles-list";

export const metadata: Metadata = { title: "Vistas · Ignacio y María" };

export default function VistasPage({ searchParams }: PageProps<"/vistas">) {
  return <TitlesList list="vistas" searchParams={searchParams} />;
}
