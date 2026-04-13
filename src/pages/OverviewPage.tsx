'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

declare global { interface Window { Chart: any; } }

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PlatformKpi {
  fmt:     { views: string; reach: string; posts: string; er: string; followers: string; likes: string };
  delta:   { views: string; reach: string; posts: string; er: string; followers: string };
  hasData: boolean;
}

interface OverviewKpi {
  fmt:   { views: string; reach: string; posts: string; er: string; followers: string };
  delta: { views: string; reach: string; posts: string; er: string };
  hasData: boolean;
}

interface MetricSeries { labels: string[]; values: number[]; }

interface AnomalyPoint {
  label:  string;
  index:  number;
  value:  number;
  zscore: number;
  type:   'peak' | 'drop';
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLT_CFG = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  tiktok:    { label: 'TikTok',    color: '#52c7cf' },
  youtube:   { label: 'YouTube',   color: '#FF0000' },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2' },
  facebook:  { label: 'Facebook',  color: '#1877F2' },
} as const;

type PltKey = keyof typeof PLT_CFG;
const ALL_PLTS = Object.keys(PLT_CFG) as PltKey[];

const METRICS = [
  { value: 'views',  label: 'Views'      },
  { value: 'reach',  label: 'Alcance'    },
  { value: 'likes',  label: 'Curtidas'   },
  { value: 'er',     label: 'ER (%)'     },
] as const;

type MetricKey = typeof METRICS[number]['value'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deltaColor(d: string): string {
  if (!d || d === '—' || d === '+0.0%' || d === '+0.00pp' || d === '+0%') return 'var(--text-muted)';
  return d.startsWith('+') ? '#4ade80' : '#f87171';
}

function Skeleton({ h = 88 }: { h?: number }) {
  return <div className="sk" style={{ height: h, borderRadius: 'var(--radius)' }} />;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, delta, loading }: {
  label: string; value: string; delta: string; loading: boolean;
}) {
  return (
    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
      {loading ? (
        <>
          <div className="sk" style={{ height: 9, width: '50%', marginBottom: 12, borderRadius: 3 }} />
          <div className="sk" style={{ height: 30, width: '70%', marginBottom: 10, borderRadius: 3 }} />
          <div className="sk" style={{ height: 9, width: '40%', borderRadius: 3 }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 8 }}>{value}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: deltaColor(delta) }}>{delta} vs período anterior</div>
        </>
      )}
    </div>
  );
}

function PlatformCard({ pltKey, data, loading, onClick }: {
  pltKey: PltKey; data: PlatformKpi | null; loading: boolean; onClick: () => void;
}) {
  const cfg = PLT_CFG[pltKey];
  return (
    <div
      onClick={onClick}
      style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 18px 16px', cursor: 'pointer', transition: 'all .18s', borderTop: `2px solid ${cfg.color}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
    >
      {loading ? (
        <>
          <div className="sk" style={{ height: 9, width: '60%', marginBottom: 12, borderRadius: 3 }} />
          <div className="sk" style={{ height: 24, width: '50%', marginBottom: 12, borderRadius: 3 }} />
          <div className="sk" style={{ height: 9, width: '80%', borderRadius: 3 }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: cfg.color, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>{cfg.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.03em', marginBottom: 8 }}>{data?.fmt.views ?? '0'}</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 2 }}>Alcance</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data?.fmt.reach ?? '0'}</div>
            </div>
            <div>
              <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 2 }}>ER</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data?.fmt.er ?? '0%'}</div>
            </div>
          </div>
          {!data?.hasData
            ? <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 500 }}>Sem dados importados</div>
            : <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450 }}>{data.fmt.posts} publicações</div>
          }
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { currentBrandId, dateRange, setPage, theme } = useApp();

  // KPIs
  const [kpiData,     setKpiData]     = useState<Record<string, PlatformKpi & { overview?: OverviewKpi }> | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Gráfico: seleção de plataformas e métrica
  const [selectedPlts, setSelectedPlts] = useState<PltKey[]>(['instagram', 'tiktok']);
  const [metric,        setMetric]       = useState<MetricKey>('views');
  const [series,        setSeries]       = useState<Partial<Record<PltKey, MetricSeries>>>({});
  const [loadingChart,  setLoadingChart] = useState(false);
  const [chartReady,    setChartReady]   = useState(false);
  const [anomalies,     setAnomalies]    = useState<AnomalyPoint[]>([]);

  const chartRef  = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<any>(null);

  const fromISO = dateRange.from.toISOString();
  const toISO   = dateRange.to.toISOString();
  const noBrand = !currentBrandId || currentBrandId.startsWith('__');

  // Espera Chart.js
  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const iv = setInterval(() => { if (window.Chart) { setChartReady(true); clearInterval(iv); } }, 50);
    return () => clearInterval(iv);
  }, []);

  // ── Fetch KPIs ──────────────────────────────────────────────────────────────
  const fetchKpis = useCallback(async () => {
    if (noBrand) { setLoadingKpis(false); return; }
    setLoadingKpis(true);
    try {
      const res = await fetch(`/api/kpis?brandId=${currentBrandId}&from=${fromISO}&to=${toISO}`);
      if (res.ok) { const json = await res.json(); setKpiData(json.data ?? null); }
    } catch { /* silencioso */ }
    setLoadingKpis(false);
  }, [currentBrandId, fromISO, toISO, noBrand]);

  // ── Fetch séries para plataformas selecionadas ──────────────────────────────
  const fetchSeries = useCallback(async () => {
    if (noBrand || selectedPlts.length === 0) { setSeries({}); return; }
    setLoadingChart(true);
    try {
      const results = await Promise.all(
        selectedPlts.map(async plt => {
          const url = `/api/metrics?brandId=${currentBrandId}&platform=${plt}&from=${fromISO}&to=${toISO}&metric=${metric}`;
          const res = await fetch(url);
          if (!res.ok) return { plt, labels: [], values: [] };
          const json = await res.json();
          return { plt, labels: json.labels ?? [], values: json.values ?? [] };
        })
      );
      const map: Partial<Record<PltKey, MetricSeries>> = {};
      results.forEach(r => { map[r.plt] = { labels: r.labels, values: r.values }; });
      setSeries(map);
    } catch { /* silencioso */ }
    setLoadingChart(false);
  }, [currentBrandId, fromISO, toISO, noBrand, selectedPlts, metric]);

  useEffect(() => { fetchKpis(); },   [fetchKpis]);
  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  // ── Fetch anomalias — usa primeira plataforma selecionada com dados ──────────
  const fetchAnomalies = useCallback(async () => {
    if (noBrand || selectedPlts.length === 0) { setAnomalies([]); return; }
    const plt = selectedPlts[0];
    try {
      const url = `/api/anomalies?brandId=${currentBrandId}&platform=${plt}&from=${fromISO}&to=${toISO}&metric=${metric}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setAnomalies(json.anomalies ?? []);
      }
    } catch { setAnomalies([]); }
  }, [currentBrandId, fromISO, toISO, noBrand, selectedPlts, metric]);

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);
  useEffect(() => {
    if (!chartReady || loadingChart || !chartRef.current) return;

    if (chartInst.current) { try { chartInst.current.destroy(); } catch (_) {} }

    const dark      = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)';
    const tickColor = dark ? '#3a3935' : '#b0ada8';
    const tooltipBg = dark ? '#141412' : '#0c0c0c';
    const font      = { family: "'InstrumentSans','Helvetica Neue',sans-serif", size: 10, weight: '500' as const };

    // Usa os labels da primeira plataforma com dados
    const labels = selectedPlts
      .map(p => series[p]?.labels ?? [])
      .find(l => l.length > 0) ?? [];

    const datasets = selectedPlts
      .filter(p => series[p]?.values?.some(v => v > 0))
      .map(p => ({
        label:              PLT_CFG[p].label,
        data:               series[p]?.values ?? [],
        borderColor:        PLT_CFG[p].color,
        backgroundColor:    PLT_CFG[p].color + '14',
        borderWidth:        1.5,
        pointRadius:        2,
        pointHoverRadius:   4,
        tension:            0.4,
        fill:               metric !== 'er',
      }));

    // Dataset de marcadores de anomalia (picos em verde, quedas em vermelho)
    if (anomalies.length > 0 && labels.length > 0) {
      const refSeries = series[selectedPlts[0]]?.values ?? [];
      const peakData  = new Array(labels.length).fill(null);
      const dropData  = new Array(labels.length).fill(null);
      anomalies.forEach(a => {
        if (a.index < refSeries.length) {
          if (a.type === 'peak') peakData[a.index] = refSeries[a.index];
          else                   dropData[a.index] = refSeries[a.index];
        }
      });
      if (peakData.some(v => v !== null)) {
        datasets.push({
          label: '▲ Pico', data: peakData,
          borderColor: '#4ade80', backgroundColor: '#4ade80',
          borderWidth: 0, pointRadius: 6, pointHoverRadius: 8,
          tension: 0, fill: false,
        } as any);
      }
      if (dropData.some(v => v !== null)) {
        datasets.push({
          label: '▼ Queda', data: dropData,
          borderColor: '#f87171', backgroundColor: '#f87171',
          borderWidth: 0, pointRadius: 6, pointHoverRadius: 8,
          tension: 0, fill: false,
        } as any);
      }
    }

    if (datasets.length === 0) return;

    chartInst.current = new window.Chart(chartRef.current.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true, position: 'top' as const,
            labels: { color: tickColor, font, boxWidth: 8, padding: 12 },
          },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: '#f2eee5', bodyColor: '#8a8880',
            titleFont: { ...font, size: 11, weight: '600' as const },
            bodyFont: font, padding: 10, cornerRadius: 6,
            borderColor: dark ? '#232320' : '#dedad2', borderWidth: 1,
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font }, beginAtZero: true },
        },
      },
    });

    return () => { if (chartInst.current) { try { chartInst.current.destroy(); } catch (_) {} } };
  }, [chartReady, loadingChart, series, selectedPlts, metric, theme, anomalies]);

  // ── Toggle plataforma ───────────────────────────────────────────────────────
  function togglePlt(plt: PltKey) {
    setSelectedPlts(prev => {
      if (prev.includes(plt)) {
        if (prev.length === 1) return prev; // mínimo 1
        return prev.filter(p => p !== plt);
      }
      return [...prev, plt];
    });
  }

  const overview = kpiData?.['overview'] as OverviewKpi | undefined;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .22s ease both' }}>

      {noBrand && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)', fontSize: 11, fontWeight: 450, color: '#a89060', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠ Esta conta ainda não foi criada no banco. Vá em <strong style={{ fontWeight: 600 }}>Contas</strong> para cadastrá-la e depois importe um CSV em <strong style={{ fontWeight: 600 }}>Importações</strong>.
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 12 }}>
        <KpiCard label="Total Views"     value={overview?.fmt.views ?? '0'}  delta={overview?.delta.views ?? '—'} loading={loadingKpis} />
        <KpiCard label="Alcance Total"   value={overview?.fmt.reach ?? '0'}  delta={overview?.delta.reach ?? '—'} loading={loadingKpis} />
        <KpiCard label="Publicações"     value={overview?.fmt.posts ?? '0'}  delta={overview?.delta.posts ?? '—'} loading={loadingKpis} />
        <KpiCard label="Eng. Rate Médio" value={overview?.fmt.er    ?? '0%'} delta={overview?.delta.er    ?? '—'} loading={loadingKpis} />
      </div>

      {/* Platform cards */}
      <div style={{ display: 'flex', gap: 12 }}>
        {ALL_PLTS.map(key => (
          <PlatformCard
            key={key}
            pltKey={key}
            data={kpiData?.[key] as PlatformKpi ?? null}
            loading={loadingKpis}
            onClick={() => setPage(key)}
          />
        ))}
      </div>

      {/* Gráfico comparativo */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Controles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Comparativo entre plataformas
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Seletor de métrica */}
            <div style={{ display: 'flex', gap: 4 }}>
              {METRICS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMetric(m.value)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 10.5, fontWeight: 500,
                    cursor: 'pointer', border: '1px solid var(--border2)',
                    background: metric === m.value ? 'var(--text)' : 'transparent',
                    color:      metric === m.value ? 'var(--bg)'   : 'var(--text-muted)',
                    fontFamily: 'var(--font)', transition: 'all .12s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Seletor de plataformas */}
            <div style={{ display: 'flex', gap: 4 }}>
              {ALL_PLTS.map(plt => {
                const active = selectedPlts.includes(plt);
                return (
                  <button
                    key={plt}
                    onClick={() => togglePlt(plt)}
                    title={PLT_CFG[plt].label}
                    style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all .12s',
                      border: `1px solid ${active ? PLT_CFG[plt].color + '66' : 'var(--border2)'}`,
                      background: active ? PLT_CFG[plt].color + '18' : 'transparent',
                      color:      active ? PLT_CFG[plt].color          : 'var(--text-muted)',
                    }}
                  >
                    {PLT_CFG[plt].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', height: 220 }}>
          {loadingChart ? (
            <div className="sk" style={{ height: '100%', borderRadius: 4 }} />
          ) : (
            <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        {/* Painel de anomalias */}
        {anomalies.length > 0 && !loadingChart && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Picos e quedas detectados — {PLT_CFG[selectedPlts[0]]?.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {anomalies.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 6,
                    background: a.type === 'peak' ? 'rgba(74,222,128,.06)' : 'rgba(248,113,113,.06)',
                    border: `1px solid ${a.type === 'peak' ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`,
                  }}
                >
                  <span style={{ fontSize: 11, color: a.type === 'peak' ? '#4ade80' : '#f87171' }}>
                    {a.type === 'peak' ? '▲' : '▼'}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)' }}>
                    {a.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 450 }}>
                    z={a.zscore > 0 ? '+' : ''}{a.zscore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
