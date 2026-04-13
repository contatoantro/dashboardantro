'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PostEntrega {
  id?:               string;
  link:              string;
  data:              string;
  views:             number;
  alcance:           number;
  curtidas:          number;
  compartilhamentos: number;
  salvamentos:       number;
  comentarios:       number;
}

export interface Entrega {
  id:          string;
  token:       string;
  tipo:        'post' | 'campanha';
  nome:        string;
  plataforma:  string;
  investimento: number;
  metaCPV:     number | null;
  status:      'ativa' | 'encerrada' | 'pendente';
  posts:       PostEntrega[];
  criadaEm:   string;
}

// ─── Funções de cálculo ───────────────────────────────────────────────────────

const CPV_BENCHMARK = 0.015;
function totalViews(e: Entrega)   { return e.posts.reduce((s, p) => s + p.views, 0); }
function totalAlcance(e: Entrega) { return e.posts.reduce((s, p) => s + p.alcance, 0); }
function totalEngs(e: Entrega)    { return e.posts.reduce((s, p) => s + p.curtidas + p.compartilhamentos + p.salvamentos + p.comentarios, 0); }
function cpv(e: Entrega)          { const v = totalViews(e);   return v > 0 ? e.investimento / v : 0; }
function cpa(e: Entrega)          { const a = totalAlcance(e); return a > 0 ? e.investimento / a : 0; }
function cpe(e: Entrega)          { const g = totalEngs(e);    return g > 0 ? e.investimento / g : 0; }
function er(e: Entrega)           { const v = totalViews(e);   return v > 0 ? (totalEngs(e) / v) * 100 : 0; }
function isCpvGood(e: Entrega)    { return cpv(e) <= (e.metaCPV ?? CPV_BENCHMARK); }
function fmtNum(n: number): string { if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'; return String(Math.round(n)); }
function fmtBRL(n: number): string { if (n >= 1) return `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; return `R$${n.toFixed(4).replace('.', ',')}` ; }
function shortLink(url: string): string { try { const u = new URL(url); return u.hostname.replace('www.', '') + u.pathname.slice(0, 16); } catch { return url.slice(0, 24); } }
function getPublicUrl(token: string): string { if (typeof window === 'undefined') return `/cliente/${token}`; return `${window.location.origin}/cliente/${token}`; }

// ─── Estilos compartilhados ────────────────────────────────────────────────────

const S = {
  label: { fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' } as React.CSSProperties,
  input: { width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 450, outline: 'none' } as React.CSSProperties,
  btnP:  { padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  btnS:  { padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' } as React.CSSProperties,
  badge: (type: 'camp'|'post'|'ok'|'pend'|'ativa'): React.CSSProperties => {
    const map = { camp: { background: 'rgba(96,165,250,.12)', color: '#60a5fa' }, post: { background: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }, ok: { background: 'rgba(74,222,128,.1)', color: '#4ade80' }, pend: { background: 'rgba(251,146,60,.1)', color: '#fb923c' }, ativa: { background: 'rgba(96,165,250,.1)', color: '#60a5fa' } };
    return { display: 'inline-flex', alignItems: 'center', fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, letterSpacing: '.04em', ...map[type] };
  },
};

// ─── ShareBox ─────────────────────────────────────────────────────────────────

function ShareBox({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = getPublicUrl(token);
  function handleCopy() { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 650 }}>◆ Link do cliente</span>
        <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(74,222,128,.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,.15)', letterSpacing: '.06em' }}>PÚBLICO</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450, marginBottom: 12, lineHeight: 1.55 }}>Qualquer pessoa com este link pode visualizar os dados desta entrega.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input readOnly value={url} style={{ ...S.input, flex: 1, color: 'var(--text-muted)', fontSize: 11, cursor: 'text' }} />
        <button onClick={handleCopy} style={{ ...S.btnP, background: copied ? 'rgba(74,222,128,.15)' : 'var(--text)', color: copied ? '#4ade80' : 'var(--bg)', border: copied ? '1px solid rgba(74,222,128,.3)' : 'none', whiteSpace: 'nowrap', transition: 'all .2s' }}>{copied ? '✓ Copiado' : 'Copiar link'}</button>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...S.btnS, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>↗ Abrir</a>
      </div>
    </div>
  );
}

// ─── Modal de criação ─────────────────────────────────────────────────────────

interface PostForm { link: string; data: string; views: string; alcance: string; curtidas: string; compartilhamentos: string; salvamentos: string; comentarios: string; }
const emptyPost = (): PostForm => ({ link: '', data: '', views: '', alcance: '', curtidas: '', compartilhamentos: '', salvamentos: '', comentarios: '' });

function Modal({ onClose, onSave }: { onClose: () => void; onSave: (data: Omit<Entrega, 'id' | 'token' | 'criadaEm'>) => void }) {
  const [tipo, setTipo] = useState<'post' | 'campanha'>('post');
  const [nome, setNome] = useState('');
  const [plataforma, setPlataforma] = useState('Instagram');
  const [investimento, setInvestimento] = useState('');
  const [metaCPV, setMetaCPV] = useState('');
  const [posts, setPosts] = useState<PostForm[]>([emptyPost()]);

  function updatePost(i: number, field: keyof PostForm, val: string) { setPosts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p)); }

  function handleSave() {
    if (!nome.trim()) { alert('Informe o nome.'); return; }
    if (!investimento || isNaN(Number(investimento))) { alert('Informe o investimento.'); return; }
    const parsedPosts: PostEntrega[] = posts.filter(p => p.link.trim()).map(p => ({
      link: p.link.trim(), data: p.data,
      views: Number(p.views) || 0, alcance: Number(p.alcance) || 0,
      curtidas: Number(p.curtidas) || 0, compartilhamentos: Number(p.compartilhamentos) || 0,
      salvamentos: Number(p.salvamentos) || 0, comentarios: Number(p.comentarios) || 0,
    }));
    const hasData = parsedPosts.some(p => p.views > 0);
    onSave({ tipo, nome: nome.trim(), plataforma, investimento: Number(investimento), metaCPV: metaCPV ? Number(metaCPV) : null, status: hasData ? 'ativa' : 'pendente', posts: parsedPosts });
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40, zIndex: 200, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: 24, width: '100%', maxWidth: 520, marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 20 }}>Nova entrega</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...S.label, marginBottom: 6 }}>Tipo</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['post', 'campanha'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)} style={{ flex: 1, padding: 9, borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: tipo === t ? 600 : 450, border: tipo === t ? '1px solid var(--text)' : '1px solid var(--border2)', background: tipo === t ? 'var(--bg-card2)' : 'transparent', color: tipo === t ? 'var(--text)' : 'var(--text-muted)', transition: 'all .12s' }}>
                {t === 'post' ? 'Post único' : 'Campanha'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><div style={{ ...S.label, marginBottom: 6 }}>Nome</div><input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: SAM · Nov 2025" style={S.input} /></div>
          <div><div style={{ ...S.label, marginBottom: 6 }}>Plataforma</div><select value={plataforma} onChange={e => setPlataforma(e.target.value)} style={S.input}>{['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook'].map(p => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div><div style={{ ...S.label, marginBottom: 6 }}>Investimento (R$)</div><input type="number" value={investimento} onChange={e => setInvestimento(e.target.value)} placeholder="16600" style={S.input} /></div>
          <div><div style={{ ...S.label, marginBottom: 6 }}>Meta CPV (R$, opcional)</div><input type="number" value={metaCPV} onChange={e => setMetaCPV(e.target.value)} placeholder="0.015" step="0.001" style={S.input} /></div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
        <div style={{ ...S.label, marginBottom: 10 }}>{tipo === 'post' ? 'Post' : 'Posts da campanha'}</div>

        {posts.map((p, i) => (
          <div key={i} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 550, color: 'var(--text-muted)' }}>{tipo === 'campanha' ? `Post ${i + 1}` : 'Post'}</span>
              {tipo === 'campanha' && posts.length > 1 && <span onClick={() => setPosts(prev => prev.filter((_, idx) => idx !== i))} style={{ fontSize: 10.5, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>✕ remover</span>}
            </div>
            <div style={{ marginBottom: 8 }}><div style={{ ...S.label, marginBottom: 4 }}>Link</div><input type="url" value={p.link} onChange={e => updatePost(i, 'link', e.target.value)} placeholder="https://instagram.com/p/..." style={S.input} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div><div style={{ ...S.label, marginBottom: 4 }}>Data</div><input type="text" value={p.data} onChange={e => updatePost(i, 'data', e.target.value)} placeholder="DD/MM/AAAA" style={S.input} /></div>
              <div><div style={{ ...S.label, marginBottom: 4 }}>Views</div><input type="number" value={p.views} onChange={e => updatePost(i, 'views', e.target.value)} placeholder="0" style={S.input} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {(['alcance', 'curtidas', 'compartilhamentos', 'salvamentos', 'comentarios'] as const).map(field => (
                <div key={field}><div style={{ ...S.label, marginBottom: 4 }}>{field.charAt(0).toUpperCase() + field.slice(1)}</div><input type="number" value={p[field]} onChange={e => updatePost(i, field, e.target.value)} placeholder="0" style={S.input} /></div>
              ))}
            </div>
          </div>
        ))}

        {tipo === 'campanha' && <button onClick={() => setPosts(prev => [...prev, emptyPost()])} style={{ ...S.btnS, width: '100%', marginBottom: 4 }}>+ Adicionar post</button>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={S.btnS}>Cancelar</button>
          <button onClick={handleSave} style={S.btnP}>Criar entrega</button>
        </div>
      </div>
    </div>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ entregas }: { entregas: Entrega[] }) {
  const totalInv = entregas.reduce((s, e) => s + e.investimento, 0);
  const totalV   = entregas.reduce((s, e) => s + totalViews(e), 0);
  const totalA   = entregas.reduce((s, e) => s + totalAlcance(e), 0);
  const cpvM     = totalV > 0 ? totalInv / totalV : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {[
        { label: 'Total investido', value: `R$${totalInv.toLocaleString('pt-BR')}`, sub: `${entregas.length} entregas` },
        { label: 'CPV médio',       value: fmtBRL(cpvM),  sub: 'por view' },
        { label: 'Total de views',  value: fmtNum(totalV), sub: 'todos os posts' },
        { label: 'Alcance total',   value: fmtNum(totalA), sub: 'contas únicas' },
      ].map(s => (
        <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
          <div style={{ ...S.label, marginBottom: 6 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.04em' }}>{s.value}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450, marginTop: 3 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── EntregaCard ──────────────────────────────────────────────────────────────

function EntregaCard({ e, onClick }: { e: Entrega; onClick: () => void }) {
  const v = totalViews(e), a = totalAlcance(e), c = cpv(e), good = isCpvGood(e);
  const sb = e.status === 'encerrada' ? 'ok' : e.status === 'pendente' ? 'pend' : 'ativa';
  return (
    <div onClick={onClick} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', cursor: 'pointer', transition: 'border-color .15s' }} onMouseEnter={e2 => (e2.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'} onMouseLeave={e2 => (e2.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 2 }}>{e.nome}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>{new Date(e.criadaEm).toLocaleDateString('pt-BR')} · R${e.investimento.toLocaleString('pt-BR')}{e.tipo === 'campanha' ? ` · ${e.posts.length} posts` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span style={S.badge(e.tipo === 'campanha' ? 'camp' : 'post')}>{e.tipo === 'campanha' ? 'campanha' : 'post único'}</span>
          <span style={S.badge(sb as 'ok'|'pend'|'ativa')}>{e.status}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        <span style={{ fontSize: 9.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--bg-card2)' }}>{e.plataforma}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {[
          { label: 'Views',   value: fmtNum(v), color: 'var(--text)' },
          { label: 'Alcance', value: fmtNum(a), color: 'var(--text)' },
          { label: 'CPV',     value: fmtBRL(c), color: good ? '#4ade80' : '#fb923c' },
          { label: e.tipo === 'campanha' ? 'Posts' : 'ER', value: e.tipo === 'campanha' ? String(e.posts.length) : `${er(e).toFixed(1)}%`, color: 'var(--text)' },
        ].map(k => (
          <div key={k.label}>
            <div style={{ ...S.label, marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DetalheView ──────────────────────────────────────────────────────────────

function DetalheView({ e, onBack }: { e: Entrega; onBack: () => void }) {
  const v = totalViews(e), a = totalAlcance(e), engs = totalEngs(e), c = cpv(e), good = isCpvGood(e), meta = e.metaCPV ?? CPV_BENCHMARK;
  const sb = e.status === 'encerrada' ? 'ok' : e.status === 'pendente' ? 'pend' : 'ativa';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ ...S.btnS, fontSize: 11, padding: '5px 12px' }}>← Voltar</button>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={S.badge(e.tipo === 'campanha' ? 'camp' : 'post')}>{e.tipo === 'campanha' ? 'campanha' : 'post único'}</span>
          <span style={S.badge(sb as 'ok'|'pend'|'ativa')}>{e.status}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{e.nome}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 450 }}>{e.plataforma} · Investimento: R${e.investimento.toLocaleString('pt-BR')}{e.metaCPV ? ` · Meta CPV: ${fmtBRL(e.metaCPV)}` : ''}</div>
      </div>

      <ShareBox token={e.token} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {[
          { label: 'Views totais', value: fmtNum(v),      sub: `${e.posts.length} post${e.posts.length > 1 ? 's' : ''}`, color: 'var(--text)',    tag: null },
          { label: 'Alcance',      value: fmtNum(a),      sub: 'contas únicas',  color: 'var(--text)',    tag: null },
          { label: 'CPV',          value: fmtBRL(c),      sub: 'custo por view', color: good ? '#4ade80' : '#fb923c', tag: good ? `↓ abaixo da meta ${fmtBRL(meta)}` : `↑ acima da meta ${fmtBRL(meta)}`, tagGood: good },
          { label: 'CPE',          value: fmtBRL(cpe(e)), sub: `${fmtNum(engs)} engajamentos`, color: 'var(--text)', tag: null },
        ].map((k, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ ...S.label, marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.04em', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 450, marginTop: 2 }}>{k.sub}</div>
            {k.tag && <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: (k as any).tagGood ? '#4ade80' : '#fb923c' }}>{k.tag}</div>}
          </div>
        ))}
      </div>

      {/* Tabela de posts */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <span style={{ fontSize: 11.5, fontWeight: 650 }}>{e.tipo === 'campanha' ? 'Posts da campanha' : 'Post'}</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>{e.posts.length} publicação{e.posts.length > 1 ? 'ões' : ''}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card2)' }}>
                {['Link', 'Data', 'Views', 'Alcance', 'Curtidas', 'Compart.', 'ER', 'CPV', 'CPA'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 8.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {e.posts.map((p, i) => {
                const pEngs = p.curtidas + p.compartilhamentos + p.salvamentos + p.comentarios;
                const share = e.investimento / e.posts.length;
                const pCpv = p.views > 0 ? share / p.views : 0;
                const pCpa = p.alcance > 0 ? share / p.alcance : 0;
                const pEr  = p.views > 0 ? (pEngs / p.views) * 100 : 0;
                const pGood = pCpv <= meta;
                return (
                  <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>{shortLink(p.link)} ↗</a></td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.data}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtNum(p.views)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtNum(p.alcance)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtNum(p.curtidas)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtNum(p.compartilhamentos)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{pEr.toFixed(1)}%</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: pGood ? '#4ade80' : '#fb923c', whiteSpace: 'nowrap' }}>{fmtBRL(pCpv)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtBRL(pCpa)}</td>
                  </tr>
                );
              })}
              {e.posts.length > 1 && (
                <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Total</td>
                  <td style={{ padding: '10px 12px' }} />
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtNum(v)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtNum(a)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>{fmtNum(e.posts.reduce((s, p) => s + p.curtidas, 0))}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>{fmtNum(e.posts.reduce((s, p) => s + p.compartilhamentos, 0))}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{er(e).toFixed(1)}%</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: good ? '#4ade80' : '#fb923c' }}>{fmtBRL(c)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>{fmtBRL(cpa(e))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EntregasPage() {
  const { currentBrandId } = useApp();

  const [entregas,   setEntregas]   = useState<Entrega[]>([]);
  const [detalhe,    setDetalhe]    = useState<Entrega | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  const noBrand = !currentBrandId || currentBrandId.startsWith('__');

  const fetchEntregas = useCallback(async () => {
    if (noBrand) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/entregas?brandId=${currentBrandId}`);
      if (res.ok) {
        const json = await res.json();
        setEntregas(json.entregas ?? []);
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [currentBrandId, noBrand]);

  useEffect(() => { fetchEntregas(); }, [fetchEntregas]);

  async function handleCreate(data: Omit<Entrega, 'id' | 'token' | 'criadaEm'>) {
    if (noBrand) return;
    setSaving(true);
    try {
      const res = await fetch('/api/entregas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: currentBrandId, ...data }),
      });
      if (res.ok) await fetchEntregas();
    } catch { /* silencioso */ }
    setSaving(false);
  }

  if (detalhe) return <DetalheView e={detalhe} onBack={() => setDetalhe(null)} />;

  const campanhas  = entregas.filter(e => e.tipo === 'campanha');
  const postsUnicos = entregas.filter(e => e.tipo === 'post');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleCreate} />}

      {noBrand && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)', fontSize: 11, fontWeight: 450, color: '#a89060' }}>
          ⚠ Cadastre a conta no banco antes de criar entregas.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Entregas — {entregas.length} registros
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={noBrand || saving}
          style={{ ...S.btnP, opacity: noBrand ? .5 : 1, cursor: noBrand ? 'not-allowed' : 'pointer' }}
        >
          + Nova entrega
        </button>
      </div>

      {loading ? (
        <div className="sk" style={{ height: 120, borderRadius: 'var(--radius)' }} />
      ) : (
        <>
          {entregas.length > 0 && <StatsBar entregas={entregas} />}

          {campanhas.length > 0 && (
            <div>
              <div style={{ ...S.label, marginBottom: 10 }}>Campanhas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {campanhas.map(e => <EntregaCard key={e.id} e={e} onClick={() => setDetalhe(e)} />)}
              </div>
            </div>
          )}

          {postsUnicos.length > 0 && (
            <div>
              <div style={{ ...S.label, marginBottom: 10 }}>Posts únicos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {postsUnicos.map(e => <EntregaCard key={e.id} e={e} onClick={() => setDetalhe(e)} />)}
              </div>
            </div>
          )}

          {entregas.length === 0 && !noBrand && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '60px 0', opacity: 0.4 }}>
              <div style={{ fontSize: 28 }}>📦</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma entrega cadastrada</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 450 }}>Clique em "+ Nova entrega" para começar.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
