'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = {
  instagram: { label: 'Instagram', color: '#E1306C', emoji: '📸' },
  tiktok:    { label: 'TikTok',    color: '#52c7cf', emoji: '🎵' },
  youtube:   { label: 'YouTube',   color: '#FF0000', emoji: '▶'  },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2', emoji: '𝕏'  },
  facebook:  { label: 'Facebook',  color: '#1877F2', emoji: '𝑓'  },
} as const;

type PlatformKey = keyof typeof PLATFORMS;

const KNOWN_COLS: Record<PlatformKey, string[]> = {
  instagram: ['Conta', 'Data', 'Alcance', 'Impressões', 'Curtidas', 'Comentários', 'Compartilhamentos', 'Salvamentos', 'Tipo de publicação'],
  tiktok:    ['Data', 'Visualizações de vídeo', 'Curtidas', 'Comentários', 'Compartilhamentos'],
  youtube:   ['Título do vídeo', 'Visualizações', 'Tempo de exibição', 'Impressões', 'CTR'],
  twitter:   ['Tweet date', 'Impressions', 'Engagements', 'Likes', 'Retweets'],
  facebook:  ['Post ID', 'Tipo de postagem', 'Alcance', 'Reações'],
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CsvPreview {
  file:     File;
  filename: string;
  rowCount: number;
  headers:  string[];
  rows:     string[][];
}

type CsvStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; message: string; rowsOk: number; rowsSkip: number }
  | { type: 'error'; message: string };

interface FollowerSnap {
  platform:   PlatformKey;
  count:      number | null;
  recordedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isColKnown(header: string, platform: PlatformKey): boolean {
  return KNOWN_COLS[platform].some(
    k => header.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(header.toLowerCase()),
  );
}

function fmt(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Seção de Seguidores ──────────────────────────────────────────────────────

function FollowersSection({ brandId, noBrand }: { brandId: string; noBrand: boolean }) {
  const [snaps,     setSnaps]     = useState<FollowerSnap[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [inputs,    setInputs]    = useState<Record<PlatformKey, string>>({
    instagram: '', tiktok: '', youtube: '', twitter: '', facebook: '',
  });
  const [saving,    setSaving]    = useState<PlatformKey | null>(null);
  const [savedMsg,  setSavedMsg]  = useState<Partial<Record<PlatformKey, string>>>({});

  // Fetch snapshots atuais
  const fetchSnaps = useCallback(async () => {
    if (noBrand) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/followers?brandId=${brandId}`);
      if (res.ok) {
        const json = await res.json();
        setSnaps(json.followers ?? []);
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [brandId, noBrand]);

  useEffect(() => { fetchSnaps(); }, [fetchSnaps]);

  async function saveFollower(platform: PlatformKey) {
    const raw = inputs[platform].trim().replace(/[.,]/g, '');
    const count = parseInt(raw, 10);
    if (isNaN(count) || count < 0) return;

    setSaving(platform);
    try {
      const res = await fetch('/api/followers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, platform, count }),
      });
      if (res.ok) {
        setInputs(i => ({ ...i, [platform]: '' }));
        setSavedMsg(m => ({ ...m, [platform]: `✓ ${fmt(count)} salvo` }));
        setTimeout(() => setSavedMsg(m => ({ ...m, [platform]: undefined })), 3000);
        fetchSnaps();
      }
    } catch { /* silencioso */ }
    setSaving(null);
  }

  const snapMap = Object.fromEntries(snaps.map(s => [s.platform, s])) as Partial<Record<PlatformKey, FollowerSnap>>;

  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>
        Seguidores Manuais
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450, marginBottom: 16, lineHeight: 1.6 }}>
        Atualização manual do total de seguidores por plataforma. Cada entrada cria um snapshot histórico.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {(Object.entries(PLATFORMS) as [PlatformKey, typeof PLATFORMS[PlatformKey]][]).map(([key, plt]) => {
          const snap = snapMap[key];
          const isSaving = saving === key;
          const msg = savedMsg[key];

          return (
            <div key={key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: plt.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: plt.color }}>
                  {plt.emoji}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{plt.label}</div>
              </div>

              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.04em', marginBottom: 4 }}>
                {loading ? '—' : fmt(snap?.count ?? null)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 450, marginBottom: 14 }}>
                Atualizado: {loading ? '—' : fmtDate(snap?.recordedAt ?? null)}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={inputs[key]}
                  onChange={e => setInputs(i => ({ ...i, [key]: e.target.value }))}
                  placeholder="Novo total..."
                  disabled={noBrand || isSaving}
                  style={{
                    flex: 1, background: 'var(--bg-card2)', border: '1px solid var(--border2)',
                    color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font)', fontSize: 12, fontWeight: 450, outline: 'none',
                    minWidth: 0, opacity: noBrand ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={() => saveFollower(key)}
                  disabled={noBrand || isSaving || !inputs[key].trim()}
                  style={{
                    padding: '7px 12px', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border2)', background: 'var(--bg-card3)',
                    color: 'var(--text-muted)', fontFamily: 'var(--font)',
                    fontSize: 11, fontWeight: 500, cursor: noBrand ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', transition: 'all .12s',
                    opacity: (!inputs[key].trim() || noBrand) ? 0.5 : 1,
                  }}
                >
                  {isSaving ? '...' : 'Salvar'}
                </button>
              </div>

              {msg && (
                <div style={{ fontSize: 10, color: '#4ade80', marginTop: 6, fontWeight: 500 }}>{msg}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Seção de CSV Upload ──────────────────────────────────────────────────────

function CsvSection({ brandId, brandName, noBrand }: { brandId: string; brandName: string; noBrand: boolean }) {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('instagram');
  const [preview,        setPreview]        = useState<CsvPreview | null>(null);
  const [status,         setStatus]         = useState<CsvStatus>({ type: 'idle' });
  const [isDragOver,     setIsDragOver]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSetPlatform(key: PlatformKey) {
    setActivePlatform(key);
    setPreview(null);
    setStatus({ type: 'idle' });
  }

  function parseCsvPreview(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const text  = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setStatus({ type: 'error', message: 'Arquivo inválido ou vazio.' }); return; }
      const sep     = text.includes('\t') ? '\t' : ',';
      const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim());
      const rows    = lines.slice(1, 6).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim()));
      setPreview({ file, filename: file.name, rowCount: lines.length - 1, headers, rows });
      setStatus({ type: 'idle' });
    };
    reader.readAsText(file);
  }

  const handleDragOver   = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave  = useCallback(() => setIsDragOver(false), []);
  const handleDrop       = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseCsvPreview(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCsvPreview(file);
    e.target.value = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmImport() {
    if (!preview) return;
    if (noBrand) {
      setStatus({ type: 'error', message: `Cadastre a marca "${brandName}" no banco antes de importar.` });
      return;
    }
    setStatus({ type: 'loading' });
    const formData = new FormData();
    formData.append('file',     preview.file);
    formData.append('brandId',  brandId);
    formData.append('platform', activePlatform);
    try {
      const res  = await fetch('/api/import', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) { setStatus({ type: 'error', message: json.error ?? 'Erro desconhecido.' }); return; }
      setStatus({ type: 'success', message: `✓ ${preview.filename} importado para ${brandName} · ${PLATFORMS[activePlatform].label}`, rowsOk: json.rowsOk, rowsSkip: json.rowsSkip });
      setPreview(null);
    } catch (err) {
      setStatus({ type: 'error', message: `Erro de conexão: ${String(err)}` });
    }
  }

  const detectedCount = preview ? preview.headers.filter(h => isColKnown(h, activePlatform)).length : 0;
  const plt = PLATFORMS[activePlatform];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Importar CSV
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>
          Marca: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{brandName}</span>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>

        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {(Object.entries(PLATFORMS) as [PlatformKey, typeof PLATFORMS[PlatformKey]][]).map(([key, p]) => {
            const isActive = key === activePlatform;
            return (
              <button key={key} onClick={() => handleSetPlatform(key)} style={{
                padding: '5px 13px', borderRadius: 4,
                border: isActive ? '1px solid transparent' : '1px solid var(--border2)',
                background: isActive ? 'var(--text)' : 'transparent',
                color: isActive ? 'var(--bg)' : 'var(--text-muted)',
                fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: isActive ? 600 : 450,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s',
              }}>
                <span style={{ fontSize: 13 }}>{p.emoji}</span>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? 'rgba(242,238,229,.3)' : 'var(--border2)'}`,
            background: isDragOver ? 'rgba(242,238,229,.03)' : 'transparent',
            borderRadius: 'var(--radius)', padding: '32px 24px', textAlign: 'center',
            cursor: 'pointer', transition: 'all .2s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.tsv" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ fontSize: 28, opacity: 0.35 }}>📄</div>
          <div style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--text-muted)' }}>
            Arraste o CSV ou clique para selecionar
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 450 }}>
            Arquivo exportado da plataforma selecionada
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-dim)', background: 'var(--bg-card2)', padding: '3px 10px', borderRadius: 10 }}>
            CSV · TSV · UTF-8
          </div>
        </div>

        {/* Status */}
        {status.type !== 'idle' && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius)',
            fontSize: 11.5, fontWeight: 500,
            background: status.type === 'success' ? 'rgba(74,222,128,.08)' : status.type === 'error' ? 'rgba(239,68,68,.08)' : 'rgba(200,175,100,.06)',
            border: `1px solid ${status.type === 'success' ? 'rgba(74,222,128,.2)' : status.type === 'error' ? 'rgba(239,68,68,.2)' : 'rgba(200,175,100,.18)'}`,
            color: status.type === 'success' ? '#4ade80' : status.type === 'error' ? '#ef4444' : '#a89060',
          }}>
            {status.type === 'loading' && '⏳ Processando...'}
            {status.type === 'success' && (
              <>{status.message} <span style={{ opacity: .7 }}>· {status.rowsOk} salvas · {status.rowsSkip} ignoradas</span></>
            )}
            {status.type === 'error' && status.message}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 650 }}>{preview.filename}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>
                {preview.rowCount} linhas · {preview.headers.length} colunas
              </span>
            </div>

            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8 }}>
              Colunas detectadas
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {preview.headers.map((h, i) => {
                const detected = isColKnown(h, activePlatform);
                return (
                  <span key={i} style={{
                    padding: '3px 9px', borderRadius: 4,
                    background: detected ? 'rgba(74,222,128,.06)' : 'var(--bg-card2)',
                    border: `1px solid ${detected ? 'rgba(74,222,128,.3)' : 'var(--border)'}`,
                    fontSize: 10, fontWeight: 500,
                    color: detected ? '#4ade80' : 'var(--text-muted)',
                  }}>
                    {h}
                  </span>
                );
              })}
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <thead>
                  <tr>
                    {preview.headers.slice(0, 8).map((h, i) => (
                      <th key={i} style={{ background: 'var(--bg-card2)', color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {h.length > 14 ? h.slice(0, 13) + '…' : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr key={ri}>
                      {preview.headers.slice(0, 8).map((_, ci) => (
                        <td key={ci} style={{ padding: '7px 10px', borderBottom: ri < preview.rows.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-muted)', fontWeight: 450, whiteSpace: 'nowrap', fontSize: 11 }}>
                          {(row[ci] || '').slice(0, 20)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450, flex: 1 }}>
                <strong style={{ fontWeight: 600 }}>{detectedCount}</strong> de <strong style={{ fontWeight: 600 }}>{preview.headers.length}</strong> colunas reconhecidas para {plt.label}
              </span>
              <button onClick={() => { setPreview(null); setStatus({ type: 'idle' }); }}
                style={{ padding: '7px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={status.type === 'loading' || noBrand}
                style={{ padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none', background: noBrand ? 'var(--bg-card2)' : 'var(--text)', color: noBrand ? 'var(--text-dim)' : 'var(--bg)', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, cursor: noBrand ? 'not-allowed' : 'pointer' }}
              >
                {status.type === 'loading' ? '⏳ Importando...' : '✓ Confirmar Importação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ImportacoesPage() {
  const { currentBrandId, currentBrand } = useApp();
  const noBrand = currentBrandId.startsWith('__');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {noBrand && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(200,175,100,.06)', border: '1px solid rgba(200,175,100,.18)', fontSize: 11, fontWeight: 450, color: '#a89060' }}>
          ⚠ A marca <strong style={{ fontWeight: 600 }}>{currentBrand.name}</strong> ainda não foi cadastrada no banco. Vá em <strong style={{ fontWeight: 600 }}>Contas</strong> para criá-la antes de importar.
        </div>
      )}

      <FollowersSection brandId={currentBrandId} noBrand={noBrand} />

      <div style={{ height: 1, background: 'var(--border)' }} />

      <CsvSection brandId={currentBrandId} brandName={currentBrand.name} noBrand={noBrand} />
    </div>
  );
}
