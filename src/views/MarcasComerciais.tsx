'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PostEntrega {
  id: string;
  link: string;
  data: string;
  views: number;
  alcance: number;
  curtidas: number;
  compartilhamentos: number;
  salvamentos: number;
  comentarios: number;
}

interface Entrega {
  id: string;
  nome: string;
  plataforma: string;
  investimento: number;
  tipo: string;
  status: string;
  criadaEm: string;
  posts: PostEntrega[];
}

interface MarcaComercial {
  id: string;
  nome: string;
  cor: string;
  emoji: string;
  entregas: Entrega[];
}

// ─── Cálculos ─────────────────────────────────────────────────────────────────

function totalViews(e: Entrega)  { return e.posts.reduce((s, p) => s + p.views, 0); }
function totalAlcance(e: Entrega){ return e.posts.reduce((s, p) => s + p.alcance, 0); }
function totalEngs(e: Entrega)   { return e.posts.reduce((s, p) => s + p.curtidas + p.compartilhamentos + p.salvamentos + p.comentarios, 0); }

function bigNumbers(entregas: Entrega[]) {
  const views      = entregas.reduce((s, e) => s + totalViews(e), 0);
  const alcance    = entregas.reduce((s, e) => s + totalAlcance(e), 0);
  const engs       = entregas.reduce((s, e) => s + totalEngs(e), 0);
  const investimento = entregas.reduce((s, e) => s + e.investimento, 0);
  const cpv = views   > 0 ? investimento / views   : 0;
  const cpa = alcance > 0 ? investimento / alcance : 0;
  const cpe = engs    > 0 ? investimento / engs    : 0;
  const er  = views   > 0 ? (engs / views) * 100   : 0;
  return { views, alcance, engs, investimento, cpv, cpa, cpe, er };
}

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
  try { const u = new URL(url); return u.hostname.replace('www.','') + u.pathname.slice(0, 18); }
  catch { return url.slice(0, 24); }
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S = {
  label: { fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' } as React.CSSProperties,
  input: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)', padding: '8px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 450, outline: 'none' } as React.CSSProperties,
  btnP:  { padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  btnS:  { padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' } as React.CSSProperties,
  card:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' } as React.CSSProperties,
};

const EMOJIS = ['🏷','🎮','🛒','🍔','👟','💄','🏋','📱','🚗','✈️','🏦','🎵','📺','🎯','🤝'];
const CORES  = ['#4ade80','#60a5fa','#f97316','#e879f9','#facc15','#f87171','#34d399','#a78bfa','#fb923c','#38bdf8'];

// ─── Modal criação/edição de marca ────────────────────────────────────────────

function ModalMarca({ initial, onSave, onClose }: {
  initial?: MarcaComercial;
  onSave: (data: { nome: string; cor: string; emoji: string }) => void;
  onClose: () => void;
}) {
  const [nome,  setNome]  = useState(initial?.nome  ?? '');
  const [cor,   setCor]   = useState(initial?.cor   ?? '#4ade80');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🏷');

  function submit() {
    if (!nome.trim()) { alert('Informe o nome.'); return; }
    onSave({ nome: nome.trim(), cor, emoji });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: 10, padding: 28, width: 400, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{initial ? 'Editar marca' : 'Nova marca comercial'}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={S.label}>Nome</div>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: KaBuM" style={S.input} autoFocus />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={S.label}>Ícone</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOJIS.map(em => (
              <button key={em} onClick={() => setEmoji(em)} style={{ fontSize: 18, padding: '4px 8px', borderRadius: 6, border: em === emoji ? '2px solid var(--text)' : '1px solid var(--border)', background: em === emoji ? 'var(--bg-card2)' : 'transparent', cursor: 'pointer' }}>{em}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={S.label}>Cor</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CORES.map(c => (
              <button key={c} onClick={() => setCor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: c === cor ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={S.btnS}>Cancelar</button>
          <button onClick={submit}  style={S.btnP}>{initial ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Big Numbers card ─────────────────────────────────────────────────────────

function BigNumbersCard({ entregas }: { entregas: Entrega[] }) {
  const bn = bigNumbers(entregas);
  const items = [
    { label: 'Views',        value: fmtNum(bn.views) },
    { label: 'Alcance',      value: fmtNum(bn.alcance) },
    { label: 'Engajamentos', value: fmtNum(bn.engs) },
    { label: 'Investimento', value: fmtBRL(bn.investimento) },
    { label: 'CPV',          value: fmtBRL(bn.cpv) },
    { label: 'CPA',          value: fmtBRL(bn.cpa) },
    { label: 'CPE',          value: fmtBRL(bn.cpe) },
    { label: 'ER Médio',     value: `${bn.er.toFixed(2)}%` },
  ];

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
        Big Numbers — consolidado
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {items.map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 8.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.03em' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tabela de entregas ───────────────────────────────────────────────────────

function TabelaEntregas({ entregas }: { entregas: Entrega[] }) {
  if (entregas.length === 0) {
    return (
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 24px', opacity: .5 }}>
        <div style={{ fontSize: 28 }}>📭</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma entrega vinculada</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 450 }}>
          Ao criar uma entrega em Comercial → Entregas, selecione esta marca para vinculá-la.
        </div>
      </div>
    );
  }

  const headers = ['Nome', 'Plataforma', 'Posts', 'Views', 'Alcance', 'Engs', 'Invest.', 'CPV', 'ER', 'Status'];

  return (
    <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
        Post a post — entregas
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card2)' }}>
              {headers.map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 8.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.1px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entregas.map((e, i) => {
              const v = totalViews(e);
              const a = totalAlcance(e);
              const g = totalEngs(e);
              const cpv = v > 0 ? e.investimento / v : 0;
              const er  = v > 0 ? (g / v) * 100 : 0;
              return (
                <tr key={e.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 550 }}>{e.nome}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 11 }}>{e.plataforma}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{e.posts.length}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fmtNum(v)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fmtNum(a)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fmtNum(g)}</td>
                  <td style={{ padding: '11px 14px' }}>{fmtBRL(e.investimento)}</td>
                  <td style={{ padding: '11px 14px', color: cpv < 0.015 ? '#4ade80' : 'var(--text)' }}>{fmtBRL(cpv)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700 }}>{er.toFixed(2)}%</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9.5, fontWeight: 600,
                      background: e.status === 'ativa' ? 'rgba(96,165,250,.1)' : e.status === 'encerrada' ? 'rgba(74,222,128,.08)' : 'rgba(251,146,60,.1)',
                      color:      e.status === 'ativa' ? '#60a5fa'             : e.status === 'encerrada' ? '#4ade80'              : '#fb923c',
                    }}>{e.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Detalhe da marca ─────────────────────────────────────────────────────────

function DetalheMarca({ marca, onBack, onEdit, onDelete }: {
  marca: MarcaComercial;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .2s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ ...S.btnS, padding: '6px 12px', fontSize: 11 }}>← Voltar</button>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: marca.cor + '22', border: `1px solid ${marca.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{marca.emoji}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{marca.nome}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450 }}>{marca.entregas.length} entrega{marca.entregas.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={onEdit}   style={{ ...S.btnS, fontSize: 11, padding: '6px 12px' }}>Editar</button>
          <button onClick={onDelete} style={{ ...S.btnS, fontSize: 11, padding: '6px 12px', color: '#f87171', borderColor: 'rgba(248,113,113,.3)' }}>Excluir</button>
        </div>
      </div>

      {/* Big Numbers */}
      {marca.entregas.length > 0 && <BigNumbersCard entregas={marca.entregas} />}

      {/* Tabela */}
      <TabelaEntregas entregas={marca.entregas} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MarcasPage() {
  const [marcas,   setMarcas]   = useState<MarcaComercial[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<MarcaComercial | null>(null);
  const [modal,    setModal]    = useState<'create' | 'edit' | null>(null);

  const fetchMarcas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marcas-comerciais');
      if (res.ok) {
        const json = await res.json();
        setMarcas(json.marcas ?? []);
        // Atualiza o selected se estiver aberto
        if (selected) {
          const updated = json.marcas?.find((m: MarcaComercial) => m.id === selected.id);
          if (updated) setSelected(updated);
        }
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [selected?.id]);

  useEffect(() => { fetchMarcas(); }, []);

  async function handleCreate(data: { nome: string; cor: string; emoji: string }) {
    const res = await fetch('/api/marcas-comerciais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { setModal(null); fetchMarcas(); }
    else alert('Erro ao criar marca.');
  }

  async function handleEdit(data: { nome: string; cor: string; emoji: string }) {
    if (!selected) return;
    const res = await fetch(`/api/marcas-comerciais/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { setModal(null); fetchMarcas(); }
    else alert('Erro ao salvar.');
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Excluir "${selected.nome}"? As entregas vinculadas não serão apagadas.`)) return;
    const res = await fetch(`/api/marcas-comerciais/${selected.id}`, { method: 'DELETE' });
    if (res.ok) { setSelected(null); fetchMarcas(); }
    else alert('Erro ao excluir.');
  }

  // ── Detalhe de uma marca ──
  if (selected && !modal) {
    return (
      <>
        <DetalheMarca
          marca={selected}
          onBack={() => setSelected(null)}
          onEdit={() => setModal('edit')}
          onDelete={handleDelete}
        />
      </>
    );
  }

  // ── Lista de marcas ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .22s ease both' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 650 }}>Marcas Comerciais</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450, marginTop: 2 }}>
            Clientes de publi e parceiros comerciais
          </div>
        </div>
        <button onClick={() => setModal('create')} style={S.btnP}>+ Nova marca</button>
      </div>

      {/* Grid de marcas */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="sk" style={{ height: 110, borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : marcas.length === 0 ? (
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 24px', opacity: .5 }}>
          <div style={{ fontSize: 36 }}>🏷</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma marca cadastrada</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 450 }}>Clique em "+ Nova marca" para começar.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {marcas.map(m => {
            const bn = bigNumbers(m.entregas);
            return (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                style={{
                  ...S.card,
                  cursor: 'pointer', transition: 'all .18s',
                  borderTop: `2px solid ${m.cor}`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: m.cor + '22', border: `1px solid ${m.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.emoji}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 650 }}>{m.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 450 }}>{m.entregas.length} entrega{m.entregas.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                {m.entregas.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Views',  value: fmtNum(bn.views) },
                      { label: 'CPV',    value: fmtBRL(bn.cpv) },
                      { label: 'ER',     value: `${bn.er.toFixed(1)}%` },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 450 }}>Sem entregas vinculadas ainda.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {modal === 'create' && (
        <ModalMarca onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && selected && (
        <ModalMarca initial={selected} onSave={handleEdit} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
