import type { Metadata } from "next";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";
import Providers from "@/components/Providers";
import { Toaster } from 'sonner';
import DrawerHost from "@/components/v2/DrawerHost";
import ToastHost from "@/components/v2/ToastHost";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Xerpa",
  description: "Plataforma inteligente de ventas B2B que optimiza la gestión de visitas comerciales y sincroniza agendas mediante Google Calendar y GraphRAG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const initialToken = cookieStore.get('sherpa_token')?.value || null;

  return (
    <html lang="en">
      <body>
        <Providers>
          <DashboardLayout initialToken={initialToken}>
            {children}
          </DashboardLayout>
          <DrawerHost />
          <ToastHost />
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
