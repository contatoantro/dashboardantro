import type { Metadata } from 'next';
import Script from 'next/script';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antro · Social Dashboard',
  description: 'Dashboard de analytics para mídias sociais',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>
        <Script
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
          strategy="beforeInteractive"
        />
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
