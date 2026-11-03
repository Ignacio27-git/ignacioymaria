import { redirect } from "next/navigation";

/** The catalog lives under /vistas and /pendientes; the root only points there. */
export default function Home() {
  redirect("/vistas");
}
