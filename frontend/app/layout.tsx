import type { Metadata } from "next";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";
import Providers from "@/components/Providers";
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "Xerpā Sales Intelligence",
  description: "Plataforma inteligente de ventas B2B que optimiza la gestión de visitas comerciales y sincroniza agendas mediante Google Calendar y GraphRAG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <DashboardLayout>
            {children}
          </DashboardLayout>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
