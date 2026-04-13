'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Brand } from '@/contexts/AppContext';

const BRAND_COLORS = ['#4ade80','#60a5fa','#f97316','#a78bfa','#f472b6','#fb923c','#34d399','#38bdf8'];
const BRAND_GRADIENTS: [string, string][] = [
  ['#2d4a2d','#3d6b3d'], ['#1e3a5f','#2a5298'], ['#4a2d1a','#7a4a2a'],
  ['#3d2d6b','#5a3d99'], ['#4a1a2d','#7a2a4a'], ['#1a3a3a','#2a6b6b'],
];

interface FormState { name: string; color: string; }
const DEFAULT_FORM: FormState = { name: '', color: BRAND_COLORS[0] };

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border2)',
  color: 'var(--text)', padding: '9px 12px', borderRadius: 'var(--radius)',
  fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 450, outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 6, display: 'block',
};

export default function MarcasPage() {
  const { brands, setBrands, brandIndex, setBrandIndex } = useApp();

  const [editId,  setEditId]  = useState<string | 'new' | null>(null);
  const [form,    setForm]    = useState<FormState>(DEFAULT_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Sync com banco ao montar ────────────────────────────────────────────
  const syncBrands = useCallback(async () => {
    try {
      const res  = await fetch('/api/brands');
      const json = await res.json();
      if (json.brands?.length > 0) {
        const synced: Brand[] = json.brands.map((b: { id: string; name: string; color: string }, i: number) => ({
          id:        b.id,
          name:      b.name,
          initial:   b.name.charAt(0).toUpperCase(),
          color:     b.color ?? BRAND_COLORS[i % BRAND_COLORS.length],
          textColor: b.color ?? BRAND_COLORS[i % BRAND_COLORS.length],
          gradient:  BRAND_GRADIENTS[i % BRAND_GRADIENTS.length],
          platforms: ['instagram','tiktok','youtube','twitter','facebook'],
          mult:      1,
        }));
        setBrands(synced);
      }
    } catch { /* silencioso */ }
  }, [setBrands]);

  useEffect(() => { syncBrands(); }, [syncBrands]);

  // ── Save ────────────────────────────────────────────────────────────────
  async function handleSave() {
    const name = form.name.trim();
    if (!name) { alert('Informe o nome da marca.'); return; }

    setSaving(true);
    setError(null);
    try {
      if (editId === 'new') {
        const res  = await fetch('/api/brands', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color: form.color }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res  = await fetch(`/api/brands/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color: form.color }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await syncBrands();
      setEditId(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete(brand: Brand, idx: number) {
    if (brands.length <= 1) { alert('É necessário manter ao menos uma marca.'); return; }
    if (!confirm(`Remover a marca "${brand.name}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      await syncBrands();
      if (brandIndex === idx) setBrandIndex(0);
      else if (brandIndex > idx) setBrandIndex(brandIndex - 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(brand: Brand) {
    setForm({ name: brand.name, color: brand.color });
    setEditId(brand.id);
  }

  const actionBtn: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer',
    border: '1px solid var(--border2)', background: 'transparent',
    color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Contas — {brands.length} marcas
        </div>
        {editId === null && (
          <button
            onClick={() => { setForm(DEFAULT_FORM); setEditId('new'); }}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
          >
            + Nova Conta
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', fontSize: 11, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Form */}
      {editId !== null && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>
            {editId === 'new' ? 'Nova Conta' : 'Editar Conta'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nome da Marca</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Brazilposting" style={inputStyle} />
            </div>

            {/* Preview */}
            <div>
              <label style={labelStyle}>Preview</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg-card2)', borderRadius: 'var(--radius)' }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#333,#555)', color: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {form.name[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontSize: 12, fontWeight: 550 }}>{form.name || 'Nova Conta'}</span>
              </div>
            </div>

            {/* Color */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Cor da marca</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {BRAND_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 24, height: 24, borderRadius: 5, cursor: 'pointer', background: c,
                      border: form.color === c ? '2px solid var(--text)' : '2px solid transparent',
                      boxShadow: form.color === c ? '0 0 0 2px var(--bg-card)' : 'none',
                      transition: 'box-shadow .12s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditId(null)} style={{ padding: '9px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={{ display: 'grid', gap: 10 }}>
        {brands.map((b, idx) => {
          const isActive = idx === brandIndex;
          return (
            <div key={b.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: b.textColor, background: `linear-gradient(135deg,${b.gradient[0]},${b.gradient[1]})` }}>
                {b.initial}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 650 }}>{b.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450, marginTop: 2 }}>
                  {b.platforms.length} plataformas
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => openEdit(b)} style={actionBtn}>Editar</button>
                {brands.length > 1 && (
                  <button onClick={() => handleDelete(b, idx)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,.2)' }}>Excluir</button>
                )}
                {isActive ? (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#4ade80', padding: '3px 10px' }}>● Ativa</span>
                ) : (
                  <button onClick={() => setBrandIndex(idx)} style={{ ...actionBtn, color: 'var(--text)' }}>Ativar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450, lineHeight: 1.65 }}>
        Cada conta corresponde a uma marca gerenciada pela agência. Dados importados ficam vinculados à conta ativa.
      </p>
    </div>
  );
}
