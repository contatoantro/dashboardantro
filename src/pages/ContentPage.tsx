'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

declare global { interface Window { Chart: any; } }

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ApiPost {
  id:          string;
  platform:    string;
  type:        string | null;
  caption:     string | null;
  date:        string;
  views:       number;
  likes:       number;
  er:          number;
  reach:       number;
  permalink:   string | null;
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

const PLATFORMS = Object.keys(PLT_CFG) as PltKey[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function Skeleton({ h = 200 }: { h?: number }) {
  return <div className="sk" style={{ height: h, borderRadius: 'var(--radius)' }} />;
}

// ─── Drawer de detalhes ───────────────────────────────────────────────────────

function PostDrawer({ post, onClose }: { post: ApiPost | null; onClose: () => void }) {
  if (!post) return null;
  const plt = PLT_CFG[post.platform as PltKey];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 400, maxWidth: '93vw',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 301, overflowY: 'auto',
        animation: 'slideIn .25s cubic-bezier(.4,0,.2,1)',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
        <div style={{ padding: '24px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: (plt?.color ?? '#888') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: plt?.color }}>
                ●
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 650 }}>{plt?.label ?? post.platform}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>
                  {post.type ?? '—'} · {new Date(post.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
          </div>

          {/* Caption */}
          <div style={{ fontSize: 13.5, fontWeight: 550, lineHeight: 1.55, marginBottom: 20 }}>
            {post.caption ?? '(sem caption)'}
          </div>

          {/* Métricas */}
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            Performance
          </div>
          {[
            { label: 'Views',   value: fmt(post.views) },
            { label: 'Likes',   value: fmt(post.likes) },
            { label: 'Alcance', value: fmt(post.reach) },
            { label: 'ER%',     value: `${post.er.toFixed(2)}%` },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 450 }}>{m.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.value}</span>
            </div>
          ))}

          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 20, padding: '10px', borderRadius: 'var(--radius)',
              border: '1px solid var(--border2)', color: 'var(--text-muted)',
              fontSize: 11.5, fontWeight: 600, textDecoration: 'none', transition: 'all .12s',
            }}>
              ↗ Ver publicação original
            </a>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ContentPage() {
  const { currentBrandId, dateRange, theme } = useApp();

  const [posts,        setPosts]        = useState<ApiPost[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<string>('all');
  const [sort,         setSort]         = useState<'views' | 'er' | 'likes'>('views');
  const [selectedPost, setSelectedPost] = useState<ApiPost | null>(null);
  const [chartReady,   setChartReady]   = useState(false);
  const [erTypeData,   setErTypeData]   = useState<{ labels: string[]; data: number[] } | null>(null);

  const scatterRef = useRef<HTMLCanvasElement>(null);
  const erTypeRef  = useRef<HTMLCanvasElement>(null);
  const chartsRef  = useRef<any[]>([]);

  const fromISO = dateRange.from.toISOString();
  const toISO   = dateRange.to.toISOString();
  const noBrand = !currentBrandId || currentBrandId.startsWith('__');

  // ── Chart.js ready ──────────────────────────────────────────────────────
  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const iv = setInterval(() => { if (window.Chart) { setChartReady(true); clearInterval(iv); } }, 50);
    return () => clearInterval(iv);
  }, []);

  // ── Fetch todos os posts de todas as plataformas ─────────────────────────
  const fetchPosts = useCallback(async () => {
    if (noBrand) { setLoading(false); return; }
    setLoading(true);
    try {
      const results = await Promise.all(
        PLATFORMS.map(plt =>
          fetch(`/api/posts?brandId=${currentBrandId}&platform=${plt}&from=${fromISO}&to=${toISO}&limit=100&sort=${sort}`)
            .then(r => r.ok ? r.json() : null)
            .then(j => (j?.posts ?? []).map((p: ApiPost) => ({ ...p, platform: plt })))
            .catch(() => [] as ApiPost[])
        )
      );
      setPosts(results.flat());
    } catch (e) {
      console.error('[ContentPage] fetch posts:', e);
    } finally {
      setLoading(false);
    }
  }, [currentBrandId, fromISO, toISO, sort, noBrand]);

  // ── Fetch ER por tipo (via /api/stats) ──────────────────────────────────
  const fetchErType = useCallback(async () => {
    if (noBrand) return;
    try {
      // Usa Instagram como proxy para tipos de conteúdo
      const res = await fetch(`/api/stats?brandId=${currentBrandId}&platform=instagram&from=${fromISO}&to=${toISO}&stat=types`);
      if (res.ok) {
        const json = await res.json();
        if (json.labels?.length > 0) setErTypeData({ labels: json.labels, data: json.data });
      }
    } catch { /* silencioso */ }
  }, [currentBrandId, fromISO, toISO, noBrand]);

  useEffect(() => { fetchPosts(); },  [fetchPosts]);
  useEffect(() => { fetchErType(); }, [fetchErType]);

  // ── Filtro + sort local ──────────────────────────────────────────────────
  const filteredPosts = posts
    .filter(p => {
      if (filter === 'all')    return true;
      if (filter === 'top')    return p.er >= 4;      // proxy para "top" sem rank no banco
      if (filter === 'bottom') return p.er < 1.5;     // proxy para "bottom"
      return p.platform === filter;
    })
    .sort((a, b) => {
      if (sort === 'er')    return b.er    - a.er;
      if (sort === 'likes') return b.likes - a.likes;
      return b.views - a.views;
    });

  // ── Constrói charts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartReady || loading) return;

    chartsRef.current.forEach(c => { try { c.destroy(); } catch (_) {} });
    chartsRef.current = [];

    const dark      = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)';
    const tickColor = dark ? '#3a3935' : '#b0ada8';
    const tooltipBg = dark ? '#141412' : '#0c0c0c';
    const font      = { family: "'InstrumentSans','Helvetica Neue',sans-serif", size: 10, weight: '500' as const };

    const baseScales = {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font }, beginAtZero: true },
    };

    const tooltipOpts = {
      backgroundColor: tooltipBg, titleColor: '#f2eee5', bodyColor: '#8a8880',
      titleFont: { ...font, size: 11, weight: '600' as const }, bodyFont: font,
      padding: 10, cornerRadius: 6,
      borderColor: dark ? '#232320' : '#dedad2', borderWidth: 1,
    };

    // Scatter: views × ER por plataforma (dados reais do banco)
    if (scatterRef.current && filteredPosts.length > 0) {
      const datasets = PLATFORMS.map(plt => ({
        label: PLT_CFG[plt].label,
        data: filteredPosts
          .filter(p => p.platform === plt)
          .map(p => ({ x: Math.round(p.views / 1000), y: p.er })),
        backgroundColor: PLT_CFG[plt].color + 'aa',
        pointRadius: 6, pointHoverRadius: 8,
      }));

      chartsRef.current.push(new window.Chart(scatterRef.current.getContext('2d'), {
        type: 'scatter',
        data: { datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' as const, labels: { color: tickColor, font, boxWidth: 8, padding: 12 } },
            tooltip: tooltipOpts,
          },
          scales: {
            x: { ...baseScales.x, title: { display: true, text: 'Views (K)', color: tickColor } },
            y: { ...baseScales.y, title: { display: true, text: 'ER (%)', color: tickColor } },
          },
        },
      }));
    }

    // ER por tipo (dados reais via /api/stats, ou vazio)
    if (erTypeRef.current && erTypeData && erTypeData.labels.length > 0) {
      const colors = ['#E1306C','#52c7cf','#FF0000','#f97316','#8b5cf6','#1877F2'];
      chartsRef.current.push(new window.Chart(erTypeRef.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: erTypeData.labels,
          datasets: [{
            data: erTypeData.data,
            backgroundColor: colors.slice(0, erTypeData.labels.length),
            borderRadius: 4, label: 'Posts',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipOpts },
          scales: baseScales,
        },
      }));
    }

    return () => { chartsRef.current.forEach(c => { try { c.destroy(); } catch (_) {} }); };
  }, [chartReady, loading, filteredPosts, erTypeData, theme]);

  // ─── Filtros ──────────────────────────────────────────────────────────────

  const filterOptions = [
    { id: 'all',    label: 'Todos',    color: undefined },
    { id: 'top',    label: '↑ Alto ER', color: undefined },
    { id: 'bottom', label: '↓ Baixo ER', color: undefined },
    ...PLATFORMS.map(k => ({ id: k, label: PLT_CFG[k].label, color: PLT_CFG[k].color })),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .22s ease both' }}>

      {noBrand && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)', fontSize: 11, fontWeight: 450, color: '#a89060' }}>
          ⚠ Cadastre a conta no banco antes de ver o conteúdo.
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>

        {/* Scatter */}
        <div style={{ gridColumn: 'span 4', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Volume × Qualidade (ER%) — por post
          </div>
          <div style={{ height: 240 }}>
            {loading
              ? <Skeleton h={240} />
              : filteredPosts.length === 0
                ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 11 }}>Sem dados no período</div>
                : <canvas ref={scatterRef} style={{ width: '100%', height: '100%' }} />
            }
          </div>
        </div>

        {/* ER por tipo */}
        <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Posts por Tipo — Instagram
          </div>
          <div style={{ height: 240 }}>
            {loading
              ? <Skeleton h={240} />
              : !erTypeData
                ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 11 }}>Sem dados</div>
                : <canvas ref={erTypeRef} style={{ width: '100%', height: '100%' }} />
            }
          </div>
        </div>
      </div>

      {/* Header + filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Ranking Global · {filteredPosts.length} posts
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as any)}
          style={{ padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, outline: 'none', cursor: 'pointer' }}
        >
          <option value="views">Ordenar: Views</option>
          <option value="er">Ordenar: ER%</option>
          <option value="likes">Ordenar: Likes</option>
        </select>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filterOptions.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '5px 13px', borderRadius: 4,
              border: `1px solid ${filter === f.id ? 'transparent' : 'var(--border2)'}`,
              background: filter === f.id ? 'var(--text)' : 'var(--bg-card)',
              color: filter === f.id ? 'var(--bg)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: filter === f.id ? 600 : 450,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all .15s', letterSpacing: '.02em',
            }}
          >
            {f.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, display: 'inline-block' }} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <Skeleton h={260} />
      ) : filteredPosts.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: .5 }}>
          <div style={{ fontSize: 28 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Sem posts no período</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card2)' }}>
                {['#', 'Plataforma', 'Tipo', 'Conteúdo', 'Data', 'Views', 'Likes', 'ER', 'Link'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 8.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post, idx) => {
                const plt = PLT_CFG[post.platform as PltKey];
                return (
                  <tr
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    style={{ cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: plt?.color ?? '#888', display: 'inline-block', flexShrink: 0 }} />
                        {plt?.label ?? post.platform}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--bg-card2)', border: '1px solid var(--border)', fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                        {post.type ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 450 }}>
                      {post.caption ?? '—'}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 450, whiteSpace: 'nowrap' }}>
                      {new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}>{fmt(post.views)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}>{fmt(post.likes)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: plt?.color, whiteSpace: 'nowrap' }}>
                      {post.er.toFixed(2)}%
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      {post.permalink ? (
                        <a href={post.permalink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                          style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', padding: '3px 8px', border: '1px solid var(--border2)', borderRadius: 4, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          ↗ Ver
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {selectedPost && <PostDrawer post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
}
