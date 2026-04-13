'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Config ───────────────────────────────────────────────────────────────────

const PLT_FIELDS = [
  { key: 'instagram', label: 'Instagram Graph API', emoji: '📸', hint: 'Token de acesso da conta Business/Creator' },
  { key: 'tiktok',    label: 'TikTok Business API', emoji: '🎵', hint: 'Disponível apenas para parceiros aprovados' },
  { key: 'youtube',   label: 'YouTube Data API v3', emoji: '▶',  hint: '10.000 units/dia no plano gratuito' },
  { key: 'twitter',   label: 'Twitter API v2',      emoji: '𝕏',  hint: 'Rate limits agressivos no free tier' },
  { key: 'facebook',  label: 'Facebook Graph API',  emoji: '𝑓',  hint: 'Requer Page Access Token válido' },
];

const AI_FIELDS = [
  { key: 'anthropic', label: 'Anthropic API',  emoji: '✦', hint: 'Configure via variável ANTHROPIC_API_KEY no .env' },
  { key: 'openai',    label: 'OpenAI API',     emoji: '⬡', hint: 'Fallback para geração de insights (opcional)' },
];

const GDRIVE_FIELD = {
  key: 'gdrive_folder', label: 'Google Drive — Folder ID', emoji: '📁',
  hint: 'ID da pasta compartilhada com o Service Account. Encontrado na URL do Drive.',
};

const TOGGLE_FIELDS = [
  { key: 'gdrive_sync',   label: 'Sincronização Google Drive', sub: 'Verifica novos CSVs automaticamente a cada 6h' },
  { key: 'auto_insights', label: 'Insights automáticos',       sub: 'Gera análise de IA após cada importação' },
  { key: 'email_reports', label: 'Relatório por email',        sub: 'Resumo semanal enviado para o email cadastrado' },
  { key: 'weekly_digest', label: 'Digest semanal',             sub: 'Resumo de performance toda segunda-feira' },
];

// Chaves que são armazenadas em env (não no banco) — só mostramos status
const ENV_KEYS = new Set(['anthropic', 'openai', 'instagram', 'tiktok', 'youtube', 'twitter', 'facebook']);

// ─── Estilos ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0,
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  color: 'var(--text)', padding: '9px 12px', borderRadius: 'var(--radius)',
  fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 450,
  outline: 'none', transition: 'border-color .15s',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '20px 22px',
};

// ─── ApiField ─────────────────────────────────────────────────────────────────

function ApiField({
  fieldKey, label, emoji, hint, isEnvKey,
  value, onSave, onClear, saving,
}: {
  fieldKey: string; label: string; emoji: string; hint: string;
  isEnvKey: boolean; value: string;
  onSave: (key: string, val: string) => void;
  onClear: (key: string) => void;
  saving: boolean;
}) {
  const [input, setInput] = useState('');
  const isSet = !!value;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          {emoji} {label}
        </span>
        <span style={{
          padding: '1px 7px', borderRadius: 4, fontSize: 8.5, fontWeight: 600,
          background: isSet ? 'rgba(74,222,128,.08)' : 'var(--bg-card3)',
          color: isSet ? '#4ade80' : 'var(--text-dim)',
          border: `1px solid ${isSet ? 'rgba(74,222,128,.2)' : 'var(--border)'}`,
          letterSpacing: '.06em',
        }}>
          {isSet ? '✓ Configurada' : 'Não configurada'}
        </span>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 450, marginBottom: 6, lineHeight: 1.5 }}>
        {isEnvKey
          ? `Configure via variável de ambiente ${fieldKey.toUpperCase().replace('-', '_')}_API_KEY no .env.local`
          : hint
        }
      </div>

      {!isEnvKey && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onSave(fieldKey, input.trim()); setInput(''); } }}
            placeholder={isSet ? value : 'Cole o valor aqui...'}
            style={inputStyle}
          />
          <button
            onClick={() => { if (input.trim()) { onSave(fieldKey, input.trim()); setInput(''); } }}
            disabled={!input.trim() || saving}
            style={{
              padding: '9px 14px', borderRadius: 'var(--radius)', cursor: 'pointer',
              border: '1px solid var(--border2)', background: 'var(--bg-card2)',
              color: 'var(--text-muted)', fontFamily: 'var(--font)',
              fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
              opacity: !input.trim() ? .5 : 1,
            }}
          >
            Salvar
          </button>
          {isSet && (
            <button
              onClick={() => onClear(fieldKey)}
              style={{
                padding: '9px 12px', borderRadius: 'var(--radius)', cursor: 'pointer',
                border: '1px solid rgba(239,68,68,.2)', background: 'transparent',
                color: '#ef4444', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 500,
              }}
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: on ? '#4ade80' : 'var(--bg-card3)',
        border: `1px solid ${on ? 'transparent' : 'var(--border2)'}`,
        position: 'relative', cursor: 'pointer', transition: 'background .2s',
      }}
    >
      <div style={{
        position: 'absolute', width: 14, height: 14,
        background: 'white', borderRadius: '50%',
        top: 2, left: on ? 18 : 2,
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { brands, currentBrandId } = useApp();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [toggles,  setToggles]  = useState<Record<string, boolean>>({
    gdrive_sync: true, auto_insights: false, email_reports: false, weekly_digest: true,
  });
  const [saving,   setSaving]   = useState(false);

  // Drive sync
  const [driveStatus,  setDriveStatus]  = useState<{ configured: boolean; lastSync: string | null; lastSyncFiles: number } | null>(null);
  const [syncing,      setSyncing]      = useState(false);
  const [syncResult,   setSyncResult]   = useState<string | null>(null);

  // Fetch settings do banco
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        const s = json.settings ?? {};
        setSettings(s);
        // Sincroniza toggles com banco
        setToggles(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(s)
              .filter(([k]) => TOGGLE_FIELDS.some(t => t.key === k))
              .map(([k, v]) => [k, v === 'true'])
          ),
        }));
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Busca status do Drive
  const fetchDriveStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/gdrive/sync');
      if (res.ok) {
        const json = await res.json();
        setDriveStatus({ configured: json.configured, lastSync: json.lastSync, lastSyncFiles: json.lastSyncFiles ?? 0 });
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { fetchDriveStatus(); }, [fetchDriveStatus]);

  // Sync manual
  async function runDriveSync() {
    if (!currentBrandId || currentBrandId.startsWith('__')) {
      setSyncResult('⚠ Selecione uma brand real antes de sincronizar.');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const res  = await fetch('/api/gdrive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: currentBrandId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido');
      setSyncResult(`✓ ${json.imported} arquivo(s) importado(s), ${json.skipped} pulado(s).`);
      fetchDriveStatus();
    } catch (e) {
      setSyncResult(`✗ ${String(e)}`);
    }
    setSyncing(false);
  }

  async function saveKey(key: string, value: string) {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch { /* silencioso */ }
    setSaving(false);
  }

  async function clearKey(key: string) {
    if (!confirm(`Remover configuração de ${key}?`)) return;
    await saveKey(key, '');
    setSettings(prev => ({ ...prev, [key]: '' }));
  }

  async function handleToggle(key: string) {
    const next = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: next }));
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: String(next) }),
    }).catch(() => {});
  }

  const sep = <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />;

  const cardTitle = (text: string): React.ReactNode => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
      {text}
    </div>
  );

  const cardSub = (text: string): React.ReactNode => (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450, marginBottom: 18, lineHeight: 1.65 }}>
      {text}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Coluna esquerda */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* API Keys de Plataformas */}
        <div style={cardStyle}>
          {cardTitle('🔑 API Keys de Plataformas')}
          {cardSub('Configure as chaves de acesso para sincronização automática. Use variáveis de ambiente em produção.')}
          {PLT_FIELDS.map(f => (
            <ApiField
              key={f.key} fieldKey={f.key} label={f.label} emoji={f.emoji} hint={f.hint}
              isEnvKey={ENV_KEYS.has(f.key)} value={settings[f.key] ?? ''}
              onSave={saveKey} onClear={clearKey} saving={saving}
            />
          ))}
        </div>

        {/* AI & Integrações */}
        <div style={cardStyle}>
          {cardTitle('✦ AI & Integrações')}
          {cardSub('Anthropic é o provedor principal de insights. Configure via .env.local — não armazene secrets no banco.')}
          {AI_FIELDS.map(f => (
            <ApiField
              key={f.key} fieldKey={f.key} label={f.label} emoji={f.emoji} hint={f.hint}
              isEnvKey={ENV_KEYS.has(f.key)} value={settings[f.key] ?? ''}
              onSave={saveKey} onClear={clearKey} saving={saving}
            />
          ))}
          {sep}
          <ApiField
            fieldKey={GDRIVE_FIELD.key} label={GDRIVE_FIELD.label}
            emoji={GDRIVE_FIELD.emoji} hint={GDRIVE_FIELD.hint}
            isEnvKey={false} value={settings[GDRIVE_FIELD.key] ?? ''}
            onSave={saveKey} onClear={clearKey} saving={saving}
          />
        </div>

        {/* Google Drive Sync */}
        <div style={cardStyle}>
          {cardTitle('📁 Google Drive — Sincronização')}
          {cardSub('Importa CSVs automaticamente da pasta configurada. Requer GOOGLE_SERVICE_ACCOUNT_JSON no .env.local.')}

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: driveStatus?.configured ? '#4ade80' : '#6b7280',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450 }}>
              {driveStatus?.configured
                ? `Integração ativa — último sync: ${driveStatus.lastSync ? new Date(driveStatus.lastSync).toLocaleString('pt-BR') : 'nunca'}`
                : 'GOOGLE_SERVICE_ACCOUNT_JSON não configurada'
              }
            </span>
          </div>

          {driveStatus?.lastSyncFiles != null && driveStatus.lastSyncFiles > 0 && (
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 12 }}>
              Último sync importou <strong style={{ fontWeight: 600 }}>{driveStatus.lastSyncFiles}</strong> arquivo(s).
            </div>
          )}

          {/* Botão sync manual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={runDriveSync}
              disabled={syncing || !driveStatus?.configured}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius)', cursor: syncing ? 'not-allowed' : 'pointer',
                border: 'none', background: driveStatus?.configured ? 'var(--text)' : 'var(--bg-card3)',
                color: driveStatus?.configured ? 'var(--bg)' : 'var(--text-dim)',
                fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600,
                opacity: syncing ? 0.6 : 1, transition: 'opacity .2s',
              }}
            >
              {syncing ? '⏳ Sincronizando...' : '↻ Sincronizar agora'}
            </button>
            {syncResult && (
              <span style={{
                fontSize: 11, fontWeight: 450,
                color: syncResult.startsWith('✓') ? '#4ade80' : '#f87171',
              }}>
                {syncResult}
              </span>
            )}
          </div>

          {sep}

          {/* Instruções */}
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 450, lineHeight: 1.7 }}>
            <strong style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Setup:</strong>
            {' '}1. Crie um Service Account no Google Cloud Console →
            {' '}2. Ative a Drive API →
            {' '}3. Baixe o JSON de credencial →
            {' '}4. Coloque o conteúdo em <code style={{ fontFamily: 'monospace', fontSize: 9.5 }}>GOOGLE_SERVICE_ACCOUNT_JSON</code> no .env.local →
            {' '}5. Compartilhe a pasta do Drive com o email do service account →
            {' '}6. Cole o Folder ID acima.
            {' '}Para sync automático, configure o <code style={{ fontFamily: 'monospace', fontSize: 9.5 }}>scripts/sync-job.sh</code> no crontab do servidor.
          </div>
        </div>
      </div>

      {/* Coluna direita */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Preferências */}
        <div style={cardStyle}>
          {cardTitle('⚙ Preferências')}
          {cardSub('Controle o comportamento automático do dashboard.')}
          {TOGGLE_FIELDS.map((t, i) => (
            <div
              key={t.key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < TOGGLE_FIELDS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 550 }}>{t.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450, marginTop: 2 }}>{t.sub}</div>
              </div>
              <Toggle on={toggles[t.key] ?? false} onChange={() => handleToggle(t.key)} />
            </div>
          ))}
        </div>

        {/* Dados */}
        <div style={cardStyle}>
          {cardTitle('🗄 Dados & Armazenamento')}
          {cardSub('Informações sobre dados importados e banco de dados.')}
          {sep}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Marcas ativas', value: `${brands.length}` },
              { label: 'Banco', value: 'PostgreSQL (Docker)' },
              { label: 'Autenticação', value: 'Google SSO · @antro.ag' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ fontWeight: 450, color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            {sep}
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 450, lineHeight: 1.65 }}>
              Secrets (API keys sensíveis) devem ser configurados via variáveis de ambiente no servidor, nunca armazenados no banco.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
