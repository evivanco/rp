import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MI-REVIEW · PRISMA 2020",
  description: "Revisión Sistemática PRISMA — Pipeline Automatizado",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
