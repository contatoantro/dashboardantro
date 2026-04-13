'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type GoalStatus = 'on' | 'risk' | 'off';

interface Goal {
  id:       string;
  title:    string;
  platform: string;
  kpi:      string;
  current:  string;
  expected: string;
  target:   string;
  deadline: string | null;
  pct:      number;
  expPct:   number;
  status:   GoalStatus;
}

interface FormState {
  title:    string;
  platform: string;
  kpi:      string;
  current:  string;
  expected: string;
  target:   string;
  pct:      string;
  expPct:   string;
  deadline: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLT_OPTIONS = [
  { value: 'all',       label: 'Todas as plataformas' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'twitter',   label: 'Twitter/X' },
  { value: 'facebook',  label: 'Facebook' },
];

const STATUS_LABEL: Record<GoalStatus, string> = {
  on:   '✓ No Prazo',
  risk: '⚠ Em Risco',
  off:  '✕ Atrasada',
};
const STATUS_COLOR: Record<GoalStatus, string> = {
  on:   '#22c55e',
  risk: '#ca8a04',
  off:  '#ef4444',
};
const STATUS_BG: Record<GoalStatus, string> = {
  on:   'rgba(34,197,94,.1)',
  risk: 'rgba(202,138,4,.1)',
  off:  'rgba(239,68,68,.1)',
};

const EMPTY_FORM: FormState = {
  title: '', platform: 'all', kpi: '', current: '',
  expected: '', target: '', pct: '', expPct: '', deadline: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(pct: number, expPct: number): GoalStatus {
  const gap = pct - expPct;
  if (gap >= 0)   return 'on';
  if (gap >= -10) return 'risk';
  return 'off';
}

function pltLabel(platform: string): string {
  return PLT_OPTIONS.find(o => o.value === platform)?.label ?? platform;
}

function fmtDeadline(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ─── Estilos compartilhados ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  color: 'var(--text)', padding: '9px 13px', borderRadius: 'var(--radius)',
  fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 450,
  outline: 'none', width: '100%', transition: 'border-color .15s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '1.2px',
};

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete, saving }: {
  goal: Goal; onEdit: () => void; onDelete: () => void; saving?: boolean;
}) {
  const gap = goal.pct - goal.expPct;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px 22px',
      opacity: saving ? 0.5 : 1, transition: 'opacity .2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 4 }}>{goal.title}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>
            {pltLabel(goal.platform)} · Prazo: {fmtDeadline(goal.deadline)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
            whiteSpace: 'nowrap', letterSpacing: '.04em',
            background: STATUS_BG[goal.status], color: STATUS_COLOR[goal.status],
          }}>
            {STATUS_LABEL[goal.status]}
          </span>
          <button onClick={onEdit} style={{ padding: '4px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'var(--bg-card2)', color: 'var(--text-muted)', fontSize: 10.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)' }}>Editar</button>
          <button onClick={onDelete} style={{ padding: '4px 10px', borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.06)', color: '#ef4444', fontSize: 10.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)' }}>Excluir</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
          <span>Real: <strong style={{ color: 'var(--text)', fontWeight: 650 }}>{goal.current}</strong></span>
          <span>Esperado: <strong style={{ color: 'var(--text)', fontWeight: 650 }}>{goal.expected}</strong></span>
          <span>Meta: <strong style={{ color: 'var(--text)', fontWeight: 650 }}>{goal.target}</strong></span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-card3)', borderRadius: 3, position: 'relative' }}>
          <div style={{
            height: '100%', width: `${Math.min(goal.pct, 100)}%`,
            background: STATUS_COLOR[goal.status], borderRadius: 3,
            transition: 'width .5s cubic-bezier(.4,0,.2,1)',
          }} />
          <div style={{
            position: 'absolute', top: -4, bottom: -4,
            left: `${Math.min(goal.expPct, 100)}%`,
            width: 2, background: 'var(--text-muted)',
            borderRadius: 2, transform: 'translateX(-50%)', opacity: .5,
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[
          { label: 'Realizado', value: `${goal.pct}%`, color: 'var(--text)' },
          { label: 'Esperado',  value: `${goal.expPct}%`, color: 'var(--text)' },
          { label: 'Gap',       value: `${gap >= 0 ? '+' : ''}${gap}pp`, color: gap >= 0 ? '#22c55e' : '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '.04em' }}>
            {s.label}
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color, marginTop: 3 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GoalForm ─────────────────────────────────────────────────────────────────

function GoalForm({ initial, onSave, onCancel, saving }: {
  initial?: Goal; onSave: (f: FormState) => void; onCancel: () => void; saving?: boolean;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? {
      title:    initial.title,
      platform: initial.platform,
      kpi:      initial.kpi,
      current:  initial.current,
      expected: initial.expected,
      target:   initial.target,
      pct:      String(initial.pct),
      expPct:   String(initial.expPct),
      deadline: initial.deadline
        ? new Date(initial.deadline).toISOString().slice(0, 10)
        : '',
    } : EMPTY_FORM
  );

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  function handleSave() {
    if (!form.title.trim() || !form.target.trim()) {
      alert('Preencha ao menos o título e a meta.');
      return;
    }
    onSave(form);
  }

  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border2)',
      borderRadius: 'var(--radius)', padding: '20px 22px', marginBottom: 4,
      opacity: saving ? 0.6 : 1,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', marginBottom: 18, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {initial ? 'Editar Meta' : 'Nova Meta'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
          <label style={labelStyle}>Título da Meta</label>
          <input style={inputStyle} value={form.title} onChange={set('title')} placeholder="Ex: Views mensais — Instagram" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Plataforma</label>
          <select style={inputStyle} value={form.platform} onChange={set('platform')}>
            {PLT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>KPI</label>
          <input style={inputStyle} value={form.kpi} onChange={set('kpi')} placeholder="Ex: Views Mensais" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Valor Atual</label>
          <input style={inputStyle} value={form.current} onChange={set('current')} placeholder="Ex: 34.2M" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Valor Esperado (OLS)</label>
          <input style={inputStyle} value={form.expected} onChange={set('expected')} placeholder="Ex: 38M" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Meta Final</label>
          <input style={inputStyle} value={form.target} onChange={set('target')} placeholder="Ex: 50M" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Progresso Real (%)</label>
          <input style={inputStyle} type="number" min={0} max={200} value={form.pct} onChange={set('pct')} placeholder="0–100" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Progresso Esperado (%)</label>
          <input style={inputStyle} type="number" min={0} max={200} value={form.expPct} onChange={set('expPct')} placeholder="0–100" />
        </div>

        <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
          <label style={labelStyle}>Prazo</label>
          <input style={inputStyle} type="date" value={form.deadline} onChange={set('deadline')} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '9px 18px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Salvando...' : 'Salvar Meta'}
        </button>
        <button onClick={onCancel} style={{ padding: '9px 18px', background: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="sk" style={{ height: 140, borderRadius: 'var(--radius)' }} />
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { currentBrandId } = useApp();

  const [goals,     setGoals]     = useState<Goal[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const noBrand = !currentBrandId || currentBrandId.startsWith('__');

  // ── Fetch goals ──────────────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    if (noBrand) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/goals?brandId=${currentBrandId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setGoals(json.goals ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [currentBrandId, noBrand]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // ── Save (create or update) ──────────────────────────────────────────────
  async function saveGoal(form: FormState) {
    const pct    = parseFloat(form.pct)    || 0;
    const expPct = parseFloat(form.expPct) || 0;
    const status = computeStatus(pct, expPct);

    const body = {
      brandId:  currentBrandId,
      title:    form.title.trim(),
      platform: form.platform,
      kpi:      form.kpi.trim(),
      current:  form.current.trim(),
      expected: form.expected.trim(),
      target:   form.target.trim(),
      pct, expPct, status,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    };

    setSaving(true);
    try {
      const isNew = editingId === '__new__';
      const url    = isNew ? '/api/goals' : `/api/goals/${editingId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? 'Erro ao salvar');

      await fetchGoals();
      setEditingId(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteGoal(id: string) {
    if (!confirm('Remover esta meta?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      setGoals(gs => gs.filter(g => g.id !== id));
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const editingGoal = editingId && editingId !== '__new__'
    ? goals.find(g => g.id === editingId)
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .22s ease both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Metas — {goals.length} cadastradas
        </div>
        {!editingId && (
          <button
            onClick={() => setEditingId('__new__')}
            disabled={noBrand}
            style={{ padding: '8px 16px', background: noBrand ? 'var(--bg-card2)' : 'var(--text)', color: noBrand ? 'var(--text-dim)' : 'var(--bg)', border: 'none', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: noBrand ? 'not-allowed' : 'pointer' }}
          >
            + Nova Meta
          </button>
        )}
      </div>

      {/* Aviso brand */}
      {noBrand && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)', fontSize: 11, fontWeight: 450, color: '#a89060' }}>
          ⚠ Crie a conta no banco (em Contas) antes de cadastrar metas.
        </div>
      )}

      {/* Erro */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', fontSize: 11, color: '#ef4444' }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>✕</button>
        </div>
      )}

      {/* Formulário */}
      {editingId && (
        <GoalForm
          initial={editingGoal}
          onSave={saveGoal}
          onCancel={() => setEditingId(null)}
          saving={saving}
        />
      )}

      {/* Lista */}
      {loading ? (
        <Skeleton />
      ) : goals.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 32, opacity: .35 }}>◎</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma meta cadastrada</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 450 }}>Clique em "+ Nova Meta" para começar.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => setEditingId(g.id)}
              onDelete={() => deleteGoal(g.id)}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
