'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PlatformKey = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

interface Props {
  platformKey: PlatformKey;
}

interface KpiData {
  fmt: {
    followers: string;
    views:     string;
    reach:     string;
    likes:     string;
    comments:  string;
    shares:    string;
    posts:     string;
    er:        string;
    impressions?: string;
  };
  delta: {
    views:    string;
    reach:    string;
    likes:    string;
    posts:    string;
    er:       string;
    followers: string;
  };
  hasData: boolean;
}

interface SeriesData {
  labels: string[];
  values: number[];
}

declare global {
  interface Window { Chart: any; }
}

// ─── Configuração estática por plataforma ─────────────────────────────────────
// KPIs: [label, apiKey, deltaKey, isER]
// apiKey = chave em kpiData.fmt | deltaKey = chave em kpiData.delta

const PLT_CONFIG = {
  instagram: {
    label: 'Instagram', color: '#E1306C',
    note: null,
    kpis: [
      { label: 'Seguidores', fmtKey: 'followers', deltaKey: 'followers', isER: false },
      { label: 'Views',      fmtKey: 'views',     deltaKey: 'views',     isER: false },
      { label: 'Alcance',    fmtKey: 'reach',     deltaKey: 'reach',     isER: false },
      { label: 'ER',         fmtKey: 'er',        deltaKey: 'er',        isER: true  },
      { label: 'Posts',      fmtKey: 'posts',     deltaKey: 'posts',     isER: false },
    ],
    // [chartId, metric param, título, span, tipo]
    charts: [
      { id: 'views',  metric: 'views', title: 'Views ao longo do tempo',  span: 3, type: 'line'     },
      { id: 'er',     metric: 'er',    title: 'Engagement Rate (%)',       span: 3, type: 'line'     },
      { id: 'reach',  metric: 'reach', title: 'Alcance',                   span: 2, type: 'line'     },
      { id: 'types',  metric: null,    title: 'Tipos de conteúdo',         span: 2, type: 'doughnut' },
      { id: 'hours',  metric: null,    title: 'Melhores horários',         span: 2, type: 'bar'      },
    ],
  },
  tiktok: {
    label: 'TikTok', color: '#52c7cf',
    note: 'TikTok fornece apenas métricas diárias por conta — dados de posts individuais não disponíveis.',
    kpis: [
      { label: 'Seguidores', fmtKey: 'followers', deltaKey: 'followers', isER: false },
      { label: 'Views',      fmtKey: 'views',     deltaKey: 'views',     isER: false },
      { label: 'Curtidas',   fmtKey: 'likes',     deltaKey: 'likes',     isER: false },
      { label: 'ER',         fmtKey: 'er',        deltaKey: 'er',        isER: true  },
      { label: 'Dias',       fmtKey: 'posts',     deltaKey: 'posts',     isER: false },
    ],
    charts: [
      { id: 'views',       metric: 'views',      title: 'Views ao longo do tempo',                span: 3, type: 'line' },
      { id: 'er',          metric: 'er',          title: 'Engagement Rate (%)',                    span: 3, type: 'line' },
      { id: 'engagement',  metric: 'engagement',  title: 'Engajamento (Likes + Comments + Shares)', span: 3, type: 'line' },
      { id: 'profile',     metric: 'reach',       title: 'Visualizações de Perfil',               span: 3, type: 'line' },
    ],
  },
  youtube: {
    label: 'YouTube', color: '#FF0000',
    note: null,
    kpis: [
      { label: 'Inscritos',   fmtKey: 'followers',  deltaKey: 'followers',  isER: false },
      { label: 'Views',       fmtKey: 'views',      deltaKey: 'views',      isER: false },
      { label: 'Watch Time',  fmtKey: 'watchTimeH', deltaKey: 'watchTimeH', isER: false },
      { label: 'ER',          fmtKey: 'er',         deltaKey: 'er',         isER: true  },
      { label: 'Vídeos',      fmtKey: 'posts',      deltaKey: 'posts',      isER: false },
    ],
    charts: [
      { id: 'views',      metric: 'views',      title: 'Views ao longo do tempo',    span: 3, type: 'line' },
      { id: 'er',         metric: 'er',          title: 'Engagement Rate (%)',         span: 3, type: 'line' },
      { id: 'watch_time', metric: 'watch_time',  title: 'Watch Time (h)',              span: 3, type: 'line' },
      { id: 'subs',       metric: 'likes',       title: 'Crescimento de inscritos',    span: 3, type: 'line' },
    ],
  },
  twitter: {
    label: 'Twitter/X', color: '#1DA1F2',
    note: 'Twitter/X não fornece dados por tweet individual via exportação CSV. Exibindo métricas diárias.',
    kpis: [
      { label: 'Seguidores',  fmtKey: 'followers',    deltaKey: 'followers', isER: false },
      { label: 'Impressões',  fmtKey: 'views',        deltaKey: 'views',     isER: false },
      { label: 'Alcance',     fmtKey: 'reach',        deltaKey: 'reach',     isER: false },
      { label: 'ER',          fmtKey: 'er',           deltaKey: 'er',        isER: true  },
      { label: 'Tweets',      fmtKey: 'posts',        deltaKey: 'posts',     isER: false },
    ],
    charts: [
      { id: 'impressions', metric: 'impressions', title: 'Impressões diárias',   span: 3, type: 'line' },
      { id: 'er',          metric: 'er',          title: 'Engagement Rate (%)',   span: 3, type: 'line' },
      { id: 'retweets',    metric: 'likes',       title: 'Retweets & Curtidas',   span: 6, type: 'line' },
    ],
  },
  facebook: {
    label: 'Facebook', color: '#1877F2',
    note: null,
    kpis: [
      { label: 'Seguidores', fmtKey: 'followers', deltaKey: 'followers', isER: false },
      { label: 'Alcance',    fmtKey: 'reach',     deltaKey: 'reach',     isER: false },
      { label: 'Reações',    fmtKey: 'likes',     deltaKey: 'likes',     isER: false },
      { label: 'ER',         fmtKey: 'er',        deltaKey: 'er',        isER: true  },
      { label: 'Posts',      fmtKey: 'posts',     deltaKey: 'posts',     isER: false },
    ],
    charts: [
      { id: 'views',     metric: 'views', title: 'Views ao longo do tempo', span: 3, type: 'line' },
      { id: 'er',        metric: 'er',    title: 'Engagement Rate (%)',      span: 3, type: 'line' },
      { id: 'reactions', metric: 'likes', title: 'Reações',                  span: 3, type: 'line' },
      { id: 'reach',     metric: 'reach', title: 'Alcance',                  span: 3, type: 'line' },
    ],
  },
} as const;

// Nenhum dado estático — tudo vem da API agora
const STATIC_CHARTS: Record<string, { labels: string[]; data: number[] }> = {};

const PIE_COLORS = ['#E1306C','#52c7cf','#FF0000','#f97316','#8b5cf6','#1877F2'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function deltaPositive(d: string): boolean {
  return d.startsWith('+') && d !== '+0.0%' && d !== '+0.00pp' && d !== '+0%';
}

// ─── Chart builder ────────────────────────────────────────────────────────────

function buildChart(
  canvasId: string,
  type: string,
  labels: string[],
  values: number[],
  color: string,
  chartRefs: React.MutableRefObject<Record<string, any>>,
  isStatic = false,
  staticData?: { labels: string[]; data: number[] },
) {
  const Chart = window.Chart;
  if (!Chart) return;

  const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!el) return;

  // destroy previous
  if (chartRefs.current[canvasId]) {
    try { chartRefs.current[canvasId].destroy(); } catch (_) {}
  }

  const ctx = el.getContext('2d')!;
  const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)';
  const tickColor = isDark ? '#3a3935' : '#b0ada8';
  const tooltipBg = isDark ? '#141412' : '#0c0c0c';
  const font      = { family: "'InstrumentSans','Helvetica Neue',sans-serif", size: 10, weight: '500' };

  const baseOpts = (isRound: boolean) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: isRound,
        position: 'right' as const,
        labels: { color: tickColor, font, padding: 8, boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: tooltipBg,
        titleColor: '#f2eee5',
        bodyColor:  '#8a8880',
        titleFont:  { ...font, size: 11, weight: '600' },
        bodyFont:   { ...font, size: 10 },
        padding: 10, cornerRadius: 6,
        borderColor: isDark ? '#232320' : '#dedad2',
        borderWidth: 1,
        displayColors: !isRound,
      },
    },
    scales: isRound ? {} : {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font }, beginAtZero: true },
    },
  });

  if (isStatic && staticData) {
    const isBar = type === 'bar';
    chartRefs.current[canvasId] = new Chart(ctx, {
      type: isBar ? 'bar' : 'doughnut',
      data: {
        labels: staticData.labels,
        datasets: isBar
          ? [{ data: staticData.data, backgroundColor: color + '88', hoverBackgroundColor: color + 'cc', borderRadius: 4, label: 'Engajamento' }]
          : [{ data: staticData.data, backgroundColor: PIE_COLORS.slice(0, staticData.labels.length), borderWidth: 0, hoverOffset: 4 }],
      },
      options: baseOpts(!isBar),
    });
    return;
  }

  const isER = canvasId.includes('_er');
  if (type === 'line') {
    chartRefs.current[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: canvasId,
          data: values,
          borderColor: color,
          borderWidth: 1.5,
          pointBackgroundColor: color,
          pointRadius: 2,
          pointHoverRadius: 4,
          backgroundColor: color + '12',
          tension: 0.4,
          fill: !isER,
        }],
      },
      options: baseOpts(false),
    });
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="sk" style={{
      background: 'var(--sk-base)',
      borderRadius: 'var(--radius)',
      ...style,
    }} />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlatformPage({ platformKey }: Props) {
  const { dateRange, currentBrandId, theme } = useApp();

  const cfg       = PLT_CONFIG[platformKey];
  const color     = cfg.color;
  const chartCfgs = cfg.charts as readonly { id: string; metric: string | null; title: string; span: number; type: string }[];

  const chartRefs = useRef<Record<string, any>>({});

  const [kpiData,    setKpiData]    = useState<KpiData | null>(null);
  const [seriesData, setSeriesData] = useState<Record<string, SeriesData>>({});
  const [kpiLoading, setKpiLoading] = useState(true);
  const [serLoading, setSerLoading] = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const fromISO = dateRange.from.toISOString();
  const toISO   = dateRange.to.toISOString();

  // ── Fetch KPIs ──────────────────────────────────────────────────────────────
  const fetchKpis = useCallback(async () => {
    if (!currentBrandId || currentBrandId.startsWith('__')) {
      setKpiData(null);
      setKpiLoading(false);
      return;
    }
    setKpiLoading(true);
    setError(null);
    try {
      const url = `/api/kpis?brandId=${currentBrandId}&platform=${platformKey}&from=${fromISO}&to=${toISO}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`KPI fetch failed: ${res.status}`);
      const json = await res.json();
      setKpiData(json.data?.[platformKey] ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setKpiLoading(false);
    }
  }, [currentBrandId, platformKey, fromISO, toISO]);

  // ── Fetch séries temporais + charts estáticos via API ─────────────────────
  const fetchSeries = useCallback(async () => {
    if (!currentBrandId || currentBrandId.startsWith('__')) {
      setSeriesData({});
      setSerLoading(false);
      return;
    }
    setSerLoading(true);
    try {
      const results = await Promise.all(
        chartCfgs.map(async c => {
          if (c.metric !== null) {
            // Série temporal via /api/metrics
            const url = `/api/metrics?brandId=${currentBrandId}&platform=${platformKey}&from=${fromISO}&to=${toISO}&metric=${c.metric}`;
            const res = await fetch(url);
            if (!res.ok) return { id: c.id, labels: [], values: [] };
            const json = await res.json();
            return { id: c.id, labels: json.labels ?? [], values: json.values ?? [] };
          } else {
            // Chart estático (types, hours, video_len) via /api/stats
            const url = `/api/stats?brandId=${currentBrandId}&platform=${platformKey}&from=${fromISO}&to=${toISO}&stat=${c.id}`;
            const res = await fetch(url);
            if (!res.ok) return { id: c.id, labels: [], values: [] };
            const json = await res.json();
            // /api/stats retorna { labels, data } — normaliza para values
            return { id: c.id, labels: json.labels ?? [], values: json.data ?? [] };
          }
        })
      );
      const map: Record<string, SeriesData> = {};
      results.forEach(r => { map[r.id] = { labels: r.labels, values: r.values }; });
      setSeriesData(map);
    } catch (e) {
      console.error('[PlatformPage] series fetch error:', e);
    } finally {
      setSerLoading(false);
    }
  }, [currentBrandId, platformKey, fromISO, toISO, chartCfgs]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);
  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  // ── Build charts quando dados e DOM estão prontos ──────────────────────────
  useEffect(() => {
    if (serLoading) return;

    // Destroy tudo antes de recriar
    Object.values(chartRefs.current).forEach(c => { try { c.destroy(); } catch (_) {} });
    chartRefs.current = {};

    let attempts = 0;
    function tryBuild() {
      if (!window.Chart) {
        if (attempts++ < 30) setTimeout(tryBuild, 100);
        return;
      }
      chartCfgs.forEach(c => {
        const canvasId = `c_${platformKey}_${c.id}`;
        const sd = seriesData[c.id];
        if (!sd || sd.labels.length === 0) return;

        const isStatic = c.metric === null;
        if (isStatic) {
          // types / hours / video_len — labels+values vêm do banco via /api/stats
          buildChart(canvasId, c.type, [], [], color, chartRefs, true, {
            labels: sd.labels,
            data:   sd.values,
          });
        } else {
          buildChart(canvasId, c.type, sd.labels, sd.values, color, chartRefs, false);
        }
      });
    }
    // Pequeno delay para garantir que os canvas estão no DOM
    setTimeout(tryBuild, 80);

    return () => {
      Object.values(chartRefs.current).forEach(c => { try { c.destroy(); } catch (_) {} });
      chartRefs.current = {};
    };
  }, [seriesData, serLoading, platformKey, theme, chartCfgs, color]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const isMockBrand = currentBrandId?.startsWith('__');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Aviso: brand não cadastrada ────────────────────────────────── */}
      {isMockBrand && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius)',
          background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)',
          fontSize: 11, fontWeight: 450, color: '#a89060',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ⚠ Esta conta ainda não foi criada no banco. Vá em Contas para cadastrá-la e depois importe um CSV em Importações.
        </div>
      )}

      {/* ── Note da plataforma ─────────────────────────────────────────── */}
      {cfg.note && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius)',
          background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)',
          fontSize: 11, fontWeight: 450, color: '#a89060',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ℹ {cfg.note}
        </div>
      )}

      {/* ── Erro ───────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 'var(--radius)',
          background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)',
          fontSize: 11, color: '#ef4444',
        }}>
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {kpiLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} style={{ height: 88 }} />
            ))
          : cfg.kpis.map((kpi, i) => {
              const val   = kpiData?.fmt[kpi.fmtKey as keyof typeof kpiData.fmt] ?? '—';
              const delt  = kpiData?.delta[kpi.deltaKey as keyof typeof kpiData.delta] ?? '—';
              const isPos = deltaPositive(delt);
              const isNeg = delt.startsWith('-');

              return (
                <div key={i} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '20px 22px',
                  transition: 'border-color .2s',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10,
                  }}>
                    {kpi.label}
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 700, letterSpacing: '-.04em',
                    lineHeight: 1, marginBottom: 8,
                  }}>
                    {val}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 500,
                    color: kpi.isER
                      ? 'var(--text-muted)'
                      : isPos ? '#4ade80'
                      : isNeg ? '#f87171'
                      : 'var(--text-muted)',
                  }}>
                    {delt !== '—' ? delt : '—'} vs anterior
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* ── Charts grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {chartCfgs.map(c => {
          const isStatic  = c.metric === null;
          const hasData   = isStatic
            ? !!STATIC_CHARTS[c.id]
            : (seriesData[c.id]?.values.some(v => v > 0) ?? false);
          const height = c.span >= 3 ? 170 : 155;
          const canvasId = `c_${platformKey}_${c.id}`;

          return (
            <div
              key={c.id}
              style={{
                gridColumn: `span ${c.span}`,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '18px 20px',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}
            >
              <div style={{
                fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)',
                letterSpacing: '.1em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              {c.title}
              </div>

              <div style={{ position: 'relative', height }}>
                {serLoading && !isStatic ? (
                  <SkeletonCard style={{ height: '100%', borderRadius: 4 }} />
                ) : !hasData && !isStatic ? (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-dim)',
                    fontSize: 11, fontWeight: 500,
                  }}>
                    Sem dados no período
                  </div>
                ) : (
                  <canvas id={canvasId} style={{ width: '100%', height: '100%' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabela de posts ────────────────────────────────────────────── */}
      <PostsSection platformKey={platformKey} color={color} />
    </div>
  );
}

// ─── Seção de posts (busca da API) ────────────────────────────────────────────

interface ApiPost {
  id:        string;
  type:      string | null;
  caption:   string | null;
  date:      string;
  views:     number | null;
  likes:     number | null;
  er:        number;
  reach:     number | null;
  permalink: string | null;
}

function PostsSection({ platformKey, color }: { platformKey: PlatformKey; color: string }) {
  const { dateRange, currentBrandId } = useApp();
  const [posts,   setPosts]   = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fromISO = dateRange.from.toISOString();
  const toISO   = dateRange.to.toISOString();

  useEffect(() => {
    if (!currentBrandId || currentBrandId.startsWith('__')) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    fetch(`/api/posts?brandId=${currentBrandId}&platform=${platformKey}&from=${fromISO}&to=${toISO}&limit=20`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
          throw new Error(err.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(json => {
        setPosts(json?.posts ?? []);
        setFetchError(null);
      })
      .catch(e => {
        setFetchError(String(e));
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [currentBrandId, platformKey, fromISO, toISO]);

  const headers = ['Tipo', 'Conteúdo', 'Data', 'Views', 'Likes', 'ER', 'Link'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '.1em',
      }}>
        Posts — Top &amp; Bottom performers
      </div>

      {loading ? (
        <SkeletonCard style={{ height: 160 }} />
      ) : fetchError ? (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', fontSize: 11, color: '#ef4444' }}>
          Erro ao carregar posts: {fetchError}
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '40px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: .5,
        }}>
          <div style={{ fontSize: 28 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Sem posts no período</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 450 }}>
            Importe dados via CSV em Importações para visualizar os posts.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card2)' }}>
                {headers.map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontSize: 8.5, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '1.2px',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => (
                <tr
                  key={post.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
                >
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 4,
                      background: 'var(--bg-card2)', border: '1px solid var(--border)',
                      fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                    }}>
                      {post.type ?? '—'}
                    </span>
                  </td>
                  <td style={{
                    padding: '11px 14px', maxWidth: 260,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: 450, color: 'var(--text)',
                  }}>
                    {post.caption ?? '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 450, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {post.views != null ? fmt(post.views) : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {post.likes != null ? fmt(post.likes) : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                    {post.er.toFixed(2)}%
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {post.permalink ? (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                          textDecoration: 'none', padding: '3px 8px',
                          border: '1px solid var(--border2)', borderRadius: 4,
                          transition: 'all .12s',
                        }}
                      >
                        ↗ Ver
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
