'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Page =
  | 'overview' | 'content' | 'goals' | 'insights' | 'importacoes' | 'entregas'
  | 'settings'
  | 'contas'
  | 'marcas'
  | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

// Período agora é sempre um range explícito de datas
export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export interface Brand {
  id: string;
  name: string;
  initial: string;
  color: string;
  textColor: string;
  gradient: [string, string];
  platforms: string[];
  mult: number;
}

const BRAND_GRADIENTS: [string, string][] = [
  ['#2d4a2d', '#3d6b3d'],
  ['#1e3a5f', '#2a5298'],
  ['#4a2d1a', '#7a4a2a'],
  ['#3d2d6b', '#5a3d99'],
];

const DEFAULT_BRANDS: Brand[] = [
  { id: '__sam', name: 'South America Memes', initial: 'S', color: '#4ade80', textColor: '#a8e6a8', gradient: BRAND_GRADIENTS[0], platforms: ['instagram','tiktok','youtube','twitter','facebook'], mult: 1 },
  { id: '__br',  name: 'Brazilposting',       initial: 'B', color: '#60a5fa', textColor: '#93c5fd', gradient: BRAND_GRADIENTS[1], platforms: ['instagram','tiktok','youtube'],                   mult: 0.62 },
  { id: '__lx',  name: 'Lixeira Memes',       initial: 'L', color: '#f97316', textColor: '#fdba74', gradient: BRAND_GRADIENTS[2], platforms: ['instagram','tiktok'],                             mult: 0.41 },
];

export const PAGE_TITLES: Record<Page, string> = {
  overview:    'Overview',
  content:     'Conteúdo',
  goals:       'Metas',
  insights:    'Insights',
  importacoes: 'Importações',
  entregas:    'Entregas',
  settings:    'Configurações',
  contas:      'Contas',
  marcas:      'Marcas',
  instagram:   'Instagram',
  tiktok:      'TikTok',
  youtube:     'YouTube',
  twitter:     'Twitter',
  facebook:    'Facebook',
};

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Gera range para um mês específico
export function monthRange(year: number, month: number): DateRange {
  const from = new Date(year, month, 1);
  const to   = new Date(year, month + 1, 1);
  return { from, to, label: `${MONTHS_PT[month]} ${year}` };
}

// Range padrão: janeiro 2026 (onde estão os dados)
function defaultRange(): DateRange {
  return monthRange(2026, 0);
}

interface AppState {
  page: Page;
  setPage: (p: Page) => void;
  brandIndex: number;
  setBrandIndex: (i: number) => void;
  brands: Brand[];
  setBrands: (b: Brand[]) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currentBrand: Brand;
  currentBrandId: string;
  // Meses disponíveis (populados via API)
  availableMonths: DateRange[];
  setAvailableMonths: (m: DateRange[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage]                   = useState<Page>('overview');
  const [brandIndex, setBrandIndex]       = useState(0);
  const [brands, setBrands]               = useState<Brand[]>(DEFAULT_BRANDS);
  const [dateRange, setDateRange]         = useState<DateRange>(defaultRange());
  const [theme, setTheme]                 = useState<'dark' | 'light'>('dark');
  const [availableMonths, setAvailableMonths] = useState<DateRange[]>([defaultRange()]);

  // Sincroniza brands com o banco
  useEffect(() => {
    fetch('/api/brands')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.brands?.length > 0) {
          const synced: Brand[] = data.brands.map((b: { id: string; name: string; color: string }, i: number) => ({
            id:        b.id,
            name:      b.name,
            initial:   b.name.charAt(0).toUpperCase(),
            color:     b.color ?? DEFAULT_BRANDS[i % DEFAULT_BRANDS.length].color,
            textColor: DEFAULT_BRANDS[i % DEFAULT_BRANDS.length].textColor,
            gradient:  BRAND_GRADIENTS[i % BRAND_GRADIENTS.length],
            platforms: ['instagram','tiktok','youtube','twitter','facebook'],
            mult:      1,
          }));
          setBrands(synced);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme    = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const currentBrand   = brands[brandIndex] ?? brands[0];
  const currentBrandId = currentBrand.id;

  return (
    <AppContext.Provider value={{
      page, setPage,
      brandIndex, setBrandIndex,
      brands, setBrands,
      dateRange, setDateRange,
      theme, toggleTheme,
      currentBrand,
      currentBrandId,
      availableMonths, setAvailableMonths,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
