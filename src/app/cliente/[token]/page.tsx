'use client';

import { useParams } from 'next/navigation';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PostEntrega {
  link:              string;
  data:              string;
  views:             number;
  alcance:           number;
  curtidas:          number;
  compartilhamentos: number;
  salvamentos:       number;
  comentarios:       number;
}

interface Entrega {
  id:           string;
  token:        string;
  tipo:         'post' | 'campanha';
  nome:         string;
  plataforma:   string;
  investimento: number;
  metaCPV:      number | null;
  status:       'ativa' | 'encerrada' | 'pendente';
  posts:        PostEntrega[];
  criadaEm:     string;
}

// ─── Mock data (espelha EntregasPage — substituir por fetch quando backend entrar) ──

const ENTREGAS_PUBLIC: Entrega[] = [
  {
    id: 'q4-2025', token: 'sam-q4-2025', tipo: 'campanha',
    nome: 'SAM · Campanha Q4 2025',
    plataforma: 'Instagram', investimento: 49800, metaCPV: 0.010,
    status: 'encerrada', criadaEm: '2025-09-01',
    posts: [
      { link: 'https://instagram.com/p/DOPCl-1ktUD', data: '05/09/2025', views: 1881710, alcance: 577126, curtidas: 44941, compartilhamentos: 17008, salvamentos: 1971, comentarios: 618 },
      { link: 'https://instagram.com/p/DOhDpbUEjGh', data: '12/09/2025', views: 2119546, alcance: 602234, curtidas: 50746, compartilhamentos: 18462, salvamentos: 2225, comentarios: 346 },
      { link: 'https://instagram.com/p/DOt7t3gklo4', data: '17/09/2025', views: 2077319, alcance: 626813, curtidas: 49308, compartilhamentos: 12218, salvamentos: 2282, comentarios: 241 },
    ],
  },
  {
    id: 'q1-2026', token: 'sam-q1-2026', tipo: 'campanha',
    nome: 'SAM · Campanha Q1 2026',
    plataforma: 'Instagram', investimento: 49800, metaCPV: 0.010,
    status: 'encerrada', criadaEm: '2026-01-01',
    posts: [
      { link: 'https://instagram.com/p/DPZuYd-kg8V', data: '04/10/2025', views: 1661668, alcance: 599973, curtidas: 37768, compartilhamentos: 11721, salvamentos: 2500, comentarios: 449 },
      { link: 'https://instagram.com/p/DPtqTaLDesh', data: '12/10/2025', views: 834622,  alcance: 264187, curtidas: 21830, compartilhamentos: 6807,  salvamentos: 1104, comentarios: 409 },
      { link: 'https://instagram.com/p/DP9HXlwjWRq', data: '18/10/2025', views: 1524217, alcance: 600819, curtidas: 36056, compartilhamentos: 10783, salvamentos: 1909, comentarios: 845 },
      { link: 'https://instagram.com/p/DMyVfgrSpzg', data: '31/07/2025', views: 1506361, alcance: 672600, curtidas: 47615, compartilhamentos: 11635, salvamentos: 2296, comentarios: 732 },
    ],
  },
  {
    id: 'post-jul', token: 'sam-post-jul2025', tipo: 'post',
    nome: 'Post único · Jul 2025',
    plataforma: 'Instagram', investimento: 16600, metaCPV: 0.015,
    status: 'encerrada', criadaEm: '2025-07-31',
    posts: [
      { link: 'https://instagram.com/p/DMyVfgrSpzg', data: '31/07/2025', views: 1506361, alcance: 672600, curtidas: 47615, compartilhamentos: 11635, salvamentos: 2296, comentarios: 732 },
    ],
  },
  {
    id: 'post-out', token: 'sam-post-out2025', tipo: 'post',
    nome: 'Post único · Out 2025',
    plataforma: 'Instagram', investimento: 16600, metaCPV: 0.015,
    status: 'pendente', criadaEm: '2025-10-12',
    posts: [
      { link: 'https://instagram.com/p/DPtqTaLDesh', data: '12/10/2025', views: 834622, alcance: 264187, curtidas: 21830, compartilhamentos: 6807, salvamentos: 1104, comentarios: 409 },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CPV_BENCHMARK = 0.015;

function totalViews(e: Entrega)   { return e.posts.reduce((s, p) => s + p.views, 0); }
function totalAlcance(e: Entrega) { return e.posts.reduce((s, p) => s + p.alcance, 0); }
function totalEngs(e: Entrega)    { return e.posts.reduce((s, p) => s + p.curtidas + p.compartilhamentos + p.salvamentos + p.comentarios, 0); }
function cpv(e: Entrega)          { const v = totalViews(e);   return v > 0 ? e.investimento / v : 0; }
function cpa(e: Entrega)          { const a = totalAlcance(e); return a > 0 ? e.investimento / a : 0; }
function cpe(e: Entrega)          { const g = totalEngs(e);    return g > 0 ? e.investimento / g : 0; }
function er(e: Entrega)           { const v = totalViews(e);   return v > 0 ? (totalEngs(e) / v) * 100 : 0; }
function isCpvGood(e: Entrega)    { return cpv(e) <= (e.metaCPV ?? CPV_BENCHMARK); }

function fmtNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(Math.round(n));
}

function fmtBRL(n: number): string {
  if (n >= 1) return `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `R$${n.toFixed(4).replace('.', ',')}`;
}

function shortLink(url: string): string {
  try { const u = new URL(url); return u.hostname.replace('www.', '') + u.pathname.slice(0, 18); }
  catch { return url.slice(0, 24); }
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      background: '#0d0d0b', color: '#f0ece3', fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{ fontSize: 36, opacity: 0.3 }}>◆</div>
      <div style={{ fontSize: 16, fontWeight: 800, opacity: 0.5 }}>Entrega não encontrada</div>
      <div style={{ fontSize: 12, opacity: 0.3 }}>O link pode ter expirado ou estar incorreto.</div>
    </div>
  );
}

// ─── Portal view ──────────────────────────────────────────────────────────────

function PortalView({ e }: { e: Entrega }) {
  const v     = totalViews(e);
  const a     = totalAlcance(e);
  const engs  = totalEngs(e);
  const c     = cpv(e);
  const good  = isCpvGood(e);
  const meta  = e.metaCPV ?? CPV_BENCHMARK;

  const statusColor = e.status === 'encerrada' ? '#4ade80' : e.status === 'pendente' ? '#fb923c' : '#60a5fa';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0b',
      color: '#f0ece3',
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid #1a1a17',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 0, background: '#0d0d0b', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#343128,#4a4640)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#f0ece3' }}>A</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-.3px' }}>Antro</span>
          <span style={{ fontSize: 11, color: '#4a4942', fontWeight: 500 }}>· Portal do Cliente</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: e.tipo === 'campanha' ? 'rgba(96,165,250,.12)' : '#1a1a17',
            color: e.tipo === 'campanha' ? '#60a5fa' : '#6b6960',
            border: e.tipo === 'campanha' ? 'none' : '1px solid #2a2a26',
          }}>
            {e.tipo === 'campanha' ? 'campanha' : 'post único'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: `${statusColor}18`, color: statusColor,
          }}>
            {e.status}
          </span>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px 64px' }}>

        {/* Title block */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.5px', marginBottom: 6 }}>
            {e.nome}
          </h1>
          <div style={{ fontSize: 12, color: '#6b6960', fontWeight: 500 }}>
            {e.plataforma} · Investimento: {fmtBRL(e.investimento)}
            {e.metaCPV ? ` · Meta CPV: ${fmtBRL(e.metaCPV)}` : ''}
            {' · '}{e.posts.length} publicação{e.posts.length > 1 ? 'ões' : ''}
          </div>
        </div>

        {/* KPI grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          border: '1px solid #1a1a17', borderRadius: 10, overflow: 'hidden',
          marginBottom: 24,
        }}>
          {[
            { label: 'Views totais',  value: fmtNum(v),      sub: `${e.posts.length} post${e.posts.length > 1 ? 's' : ''}`, color: '#f0ece3', tag: null },
            { label: 'Alcance',       value: fmtNum(a),      sub: 'contas únicas',    color: '#f0ece3', tag: null },
            { label: 'CPV',           value: fmtBRL(c),      sub: 'custo por view',   color: good ? '#4ade80' : '#fb923c',
              tag: good ? `↓ abaixo da meta ${fmtBRL(meta)}` : `↑ acima da meta ${fmtBRL(meta)}`, tagColor: good ? '#4ade80' : '#fb923c' },
            { label: 'CPE',           value: fmtBRL(cpe(e)), sub: `${fmtNum(engs)} engajamentos`, color: '#f0ece3', tag: null },
          ].map((k, i) => (
            <div key={i} style={{
              padding: '18px 20px',
              borderRight: i < 3 ? '1px solid #1a1a17' : 'none',
              background: '#0d0d0b',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#4a4942', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', color: k.color, marginBottom: 4 }}>
                {k.value}
              </div>
              <div style={{ fontSize: 10.5, color: '#4a4942', fontWeight: 500 }}>{k.sub}</div>
              {k.tag && (
                <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 5, color: (k as any).tagColor }}>
                  {k.tag}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats secundários */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28,
        }}>
          {[
            { label: 'ER médio',    value: `${er(e).toFixed(1)}%` },
            { label: 'CPA',         value: fmtBRL(cpa(e)) },
            { label: 'Curtidas',    value: fmtNum(e.posts.reduce((s, p) => s + p.curtidas, 0)) },
          ].map(s => (
            <div key={s.label} style={{
              background: '#111110', border: '1px solid #1a1a17',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#4a4942', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.4px' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Posts table */}
        <div style={{ background: '#111110', border: '1px solid #1a1a17', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid #1a1a17',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              {e.tipo === 'campanha' ? 'Posts da campanha' : 'Post'}
            </span>
            <span style={{ fontSize: 11, color: '#4a4942', fontWeight: 500 }}>
              {e.posts.length} publicação{e.posts.length > 1 ? 'ões' : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#0d0d0b' }}>
                  {['Link', 'Data', 'Views', 'Alcance', 'Curtidas', 'Compart.', 'ER', 'CPV', 'CPA'].map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left',
                      fontSize: 9.5, fontWeight: 700, color: '#4a4942',
                      textTransform: 'uppercase', letterSpacing: '.5px',
                      borderBottom: '1px solid #1a1a17', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.posts.map((p, i) => {
                  const pEngs  = p.curtidas + p.compartilhamentos + p.salvamentos + p.comentarios;
                  const share  = e.investimento / e.posts.length;
                  const pCpv   = p.views  > 0 ? share / p.views  : 0;
                  const pCpa   = p.alcance > 0 ? share / p.alcance : 0;
                  const pEr    = p.views  > 0 ? (pEngs / p.views) * 100 : 0;
                  const pGood  = pCpv <= meta;
                  return (
                    <tr key={i} style={{ borderTop: i > 0 ? '1px solid #1a1a17' : 'none' }}>
                      <td style={{ padding: '10px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a href={p.link} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: '#6b6960', textDecoration: 'none' }}>
                          {shortLink(p.link)} ↗
                        </a>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: '#4a4942', whiteSpace: 'nowrap' }}>{p.data}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtNum(p.views)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtNum(p.alcance)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b6960', whiteSpace: 'nowrap' }}>{fmtNum(p.curtidas)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b6960', whiteSpace: 'nowrap' }}>{fmtNum(p.compartilhamentos)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{pEr.toFixed(1)}%</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: pGood ? '#4ade80' : '#fb923c', whiteSpace: 'nowrap' }}>{fmtBRL(pCpv)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b6960', whiteSpace: 'nowrap' }}>{fmtBRL(pCpa)}</td>
                    </tr>
                  );
                })}

                {/* Total row */}
                {e.posts.length > 1 && (
                  <tr style={{ borderTop: '1px solid #2a2a26', background: '#0d0d0b' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#4a4942' }}>Total</td>
                    <td style={{ padding: '10px 14px' }} />
                    <td style={{ padding: '10px 14px', fontWeight: 800 }}>{fmtNum(v)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800 }}>{fmtNum(a)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#6b6960' }}>{fmtNum(e.posts.reduce((s, p) => s + p.curtidas, 0))}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#6b6960' }}>{fmtNum(e.posts.reduce((s, p) => s + p.compartilhamentos, 0))}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{er(e).toFixed(1)}%</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: good ? '#4ade80' : '#fb923c' }}>{fmtBRL(c)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#6b6960' }}>{fmtBRL(cpa(e))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 10.5, color: '#2a2a26', fontWeight: 500 }}>
          Gerado por Antro · Social Dashboard
        </div>
      </main>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function ClientePage() {
  const params = useParams();
  const token  = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const entrega = ENTREGAS_PUBLIC.find(e => e.token === token) ?? null;

  if (!entrega) return <NotFound />;
  return <PortalView e={entrega} />;
}
