import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ignacio y María",
  description: "Películas y series de Ignacio y María",
};

// Spike (D-50): the theme cookie is read on the server so the initial HTML
// already carries data-theme. "system" (or anything else) omits the attribute.
async function ThemedDocument({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = store.get("theme")?.value;
  const dataTheme = theme === "dark" || theme === "light" ? theme : undefined;

  return (
    <html
      lang="es"
      data-theme={dataTheme}
      className={`${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <ThemedDocument>{children}</ThemedDocument>
    </Suspense>
  );
}
