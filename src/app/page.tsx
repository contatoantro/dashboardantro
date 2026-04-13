'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp, Page } from '@/contexts/AppContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import OverviewPage from '@/views/OverviewPage';
import ContentPage from '@/views/ContentPage';
import GoalsPage from '@/views/GoalsPage';
import ImportacoesPage from '@/views/ImportacoesPage';
import PlatformPage, { type PlatformKey } from '@/views/PlatformPage';
import SettingsPage from '@/views/SettingsPage';
import ContasPage from '@/views/MarcasPage';      // gestão de brands de conteúdo
import MarcasComerciais from '@/views/MarcasComerciais'; // clientes de publi ← nova
import InsightsPage from '@/views/InsightsPage';
import EntregasPage from '@/views/EntregasPage';

const PLATFORM_PAGES = new Set<Page>(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']);

function EmptyPage({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.4 }}>
      <div style={{ fontSize: 36 }}>🚧</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>{label} — em construção</div>
    </div>
  );
}

function PageRouter() {
  const { page } = useApp();

  if (PLATFORM_PAGES.has(page)) {
    return <PlatformPage platformKey={page as PlatformKey} />;
  }

  switch (page) {
    case 'overview':    return <OverviewPage />;
    case 'content':     return <ContentPage />;
    case 'goals':       return <GoalsPage />;
    case 'importacoes': return <ImportacoesPage />;
    case 'entregas':    return <EntregasPage />;
    case 'settings':    return <SettingsPage />;
    case 'contas':      return <ContasPage />;
    case 'marcas':      return <MarcasComerciais />;  // ← nova página
    case 'insights':    return <InsightsPage />;
    default:            return <EmptyPage label={page} />;
  }
}

function Dashboard() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: 18,
          background: 'var(--bg)',
        }}>
          <PageRouter />
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}
