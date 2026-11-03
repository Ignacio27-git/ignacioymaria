import type { Metadata } from "next";

import { TitlesList } from "../titles-list";

export const metadata: Metadata = { title: "Pendientes · Ignacio y María" };

export default function PendientesPage({
  searchParams,
}: PageProps<"/pendientes">) {
  return <TitlesList list="pendientes" searchParams={searchParams} />;
}
