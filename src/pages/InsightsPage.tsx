'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Insight {
  id:         string;
  platform:   string;
  type:       'performance' | 'trend' | 'alert' | 'opportunity';
  title:      string;
  body:       string;
  delta:      string;
  deltaLabel: string;
  tag:        string;
  age:        string;
  isReal?:    boolean;
}

// ─── Mock (demo sem API key) ───────────────────────────────────────────────────

const MOCK_INSIGHTS: Insight[] = [
  { id:'i1', platform:'instagram', type:'performance', title:'Reels dominam o alcance',        body:'Nos últimos 30 dias, Reels geraram 52% do alcance total do Instagram, com ER médio 2.1× maior que Carrosséis. Considere aumentar a frequência de Reels nos próximos ciclos.',                                                              delta:'+2.1×',  deltaLabel:'ER vs Carrossel',     tag:'Conteúdo',    age:'2h atrás' },
  { id:'i2', platform:'tiktok',    type:'trend',       title:'Pico de views às 14h–18h',        body:'O engajamento no TikTok concentra-se entre 14h e 18h (horário de Brasília). Posts publicados fora dessa janela têm em média 34% menos visualizações nas primeiras 2 horas.',                                                              delta:'-34%',   deltaLabel:'views fora da janela', tag:'Horário',     age:'5h atrás' },
  { id:'i3', platform:'youtube',   type:'alert',       title:'CTR abaixo da média do canal',    body:'Os últimos 2 vídeos apresentaram CTR de 2.1% e 2.3%, abaixo da média histórica de 3.8%. Títulos e thumbnails podem estar menos alinhados com o interesse atual da audiência.',                                                            delta:'-1.7pp', deltaLabel:'abaixo da média',      tag:'Alerta',      age:'1d atrás' },
  { id:'i4', platform:'instagram', type:'opportunity', title:'Horário subutilizado: 20h–22h',   body:'Análise dos últimos 60 dias indica que publicações entre 20h e 22h têm alcance 18% acima da média, mas representam apenas 8% dos posts. Há espaço para crescimento nessa janela.',                                                       delta:'+18%',   deltaLabel:'alcance nessa janela', tag:'Oportunidade', age:'1d atrás' },
  { id:'i5', platform:'facebook',  type:'performance', title:'Vídeos superam fotos em reações', body:'Vídeos no Facebook geram 2.8× mais reações que fotos no mesmo período. O custo de produção vs. retorno favorece fortemente o formato de vídeo curto (até 60s).',                                                                          delta:'2.8×',   deltaLabel:'reações vs foto',      tag:'Formato',     age:'2d atrás' },
  { id:'i6', platform:'twitter',   type:'trend',       title:'Engajamento cresce às terças',    body:'Terças-feiras concentram o maior volume de impressões e retweets da semana no Twitter/X. Threads publicadas nesse dia têm alcance orgânico 22% superior à média semanal.',                                                                delta:'+22%',   deltaLabel:'alcance nas terças',   tag:'Dia da semana', age:'3d atrás' },
];

// ─── Visual config ────────────────────────────────────────────────────────────

const PLT_CFG = {
  instagram: { label: 'Instagram', color: '#E1306C', emoji: '📸' },
  tiktok:    { label: 'TikTok',    color: '#52c7cf', emoji: '🎵' },
  youtube:   { label: 'YouTube',   color: '#FF0000', emoji: '▶'  },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2', emoji: '𝕏'  },
  facebook:  { label: 'Facebook',  color: '#1877F2', emoji: '𝑓'  },
} as const;

const TYPE_COLOR: Record<string, string> = {
  performance: '#4ade80',
  trend:       '#60a5fa',
  alert:       '#f97316',
  opportunity: '#a78bfa',
};

const TYPE_ICON: Record<string, string> = {
  performance: '↑',
  trend:       '〜',
  alert:       '⚠',
  opportunity: '◎',
};

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const plt       = PLT_CFG[insight.platform as keyof typeof PLT_CFG];
  const typeColor = TYPE_COLOR[insight.type] ?? '#f2eee5';
  const typeIcon  = TYPE_ICON[insight.type]  ?? '·';

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: insight.isReal ? 1 : 0.82,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${typeColor}18`, color: typeColor, fontSize: 12, fontWeight: 700,
          }}>
            {typeIcon}
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 4 }}>{insight.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${plt?.color}18`, color: plt?.color }}>
                {plt?.emoji} {plt?.label}
              </span>
              <span style={{ fontSize: 9.5, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {insight.tag}
              </span>
              {insight.isReal && (
                <span style={{ fontSize: 8.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,222,128,.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)', letterSpacing: '.04em' }}>
                  IA REAL
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: 'var(--text-dim)', fontWeight: 450, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {insight.age}
        </span>
      </div>

      {/* Body */}
      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 450, lineHeight: 1.7, margin: 0 }}>
        {insight.body}
      </p>

      {/* Delta */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 'var(--radius)',
        background: 'var(--bg-card2)', border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 750, color: typeColor }}>{insight.delta}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450 }}>{insight.deltaLabel}</span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InsightSkeleton() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="sk" style={{ height: 26, width: '60%', borderRadius: 4 }} />
      <div className="sk" style={{ height: 11, width: '100%', borderRadius: 4 }} />
      <div className="sk" style={{ height: 11, width: '85%', borderRadius: 4 }} />
      <div className="sk" style={{ height: 11, width: '70%', borderRadius: 4 }} />
      <div className="sk" style={{ height: 32, width: '40%', borderRadius: 4 }} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { currentBrand, currentBrandId, dateRange } = useApp();

  const [insights,   setInsights]   = useState<Insight[]>([]);
  const [hasApiKey,  setHasApiKey]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const noBrand = !currentBrandId || currentBrandId.startsWith('__');
  const fromISO = dateRange.from.toISOString();
  const toISO   = dateRange.to.toISOString();

  // Verifica se API key está configurada
  useEffect(() => {
    fetch('/api/insights/status')
      .then(r => r.ok ? r.json() : null)
      .then(json => setHasApiKey(json?.hasKey ?? false))
      .catch(() => setHasApiKey(false));
  }, []);

  // Busca insights reais do banco
  const fetchInsights = useCallback(async () => {
    if (noBrand || !hasApiKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/insights?brandId=${currentBrandId}&from=${fromISO}&to=${toISO}`);
      if (res.ok) {
        const json = await res.json();
        setInsights(json.insights ?? []);
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [currentBrandId, fromISO, toISO, noBrand, hasApiKey]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // Gera novos insights via Anthropic
  async function generateInsights() {
    if (noBrand || !hasApiKey) return;
    setGenerating(true);
    setError(null);
    try {
      const res  = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: currentBrandId, from: fromISO, to: toISO }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar insights');
      await fetchInsights();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  const displayInsights = hasApiKey && insights.length > 0 ? insights : MOCK_INSIGHTS;
  const isDemo = !hasApiKey || insights.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .22s ease both', paddingTop: 4 }}>

      {/* ── Banner de status ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 15 }}>✦</span>
            <span style={{ fontSize: 13.5, fontWeight: 650 }}>Insights com IA</span>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: hasApiKey ? 'rgba(74,222,128,.1)' : 'rgba(200,175,100,.08)',
              border: `1px solid ${hasApiKey ? 'rgba(74,222,128,.2)' : 'rgba(200,175,100,.18)'}`,
              color: hasApiKey ? '#4ade80' : '#a89060',
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}>
              {hasApiKey ? 'Ativo' : 'Em breve'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 450, lineHeight: 1.65, margin: 0, maxWidth: 540 }}>
            {hasApiKey
              ? `Insights gerados pelo Claude (Anthropic) com base nos dados importados de ${currentBrand.name}. Clique em "Gerar agora" para atualizar.`
              : 'Configure a Anthropic API Key em Configurações para gerar insights automáticos após cada importação de CSV. Os cards abaixo são exemplos simulados.'
            }
          </p>
        </div>

        {/* Ação / status */}
        <div style={{ flexShrink: 0 }}>
          {hasApiKey ? (
            <button
              onClick={generateInsights}
              disabled={generating || noBrand}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none',
                background: noBrand ? 'var(--bg-card2)' : 'var(--text)',
                color: noBrand ? 'var(--text-dim)' : 'var(--bg)',
                fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600,
                cursor: generating || noBrand ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1, transition: 'opacity .2s',
              }}
            >
              {generating ? '⏳ Gerando...' : '✦ Gerar agora'}
            </button>
          ) : (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius)',
              background: 'var(--bg-card2)', border: '1px solid var(--border2)',
              textAlign: 'center', minWidth: 110,
            }}>
              <div style={{ fontSize: 18, marginBottom: 4, opacity: .6 }}>🔌</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Aguardando</div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 450, marginTop: 2 }}>API key necessária</div>
            </div>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', fontSize: 11, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* ── Como funciona (só aparece sem key) ──────────────────────── */}
      {!hasApiKey && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { n: 1, label: 'Importar CSV',    sub: 'Dados entram via drag-and-drop na página Importações' },
            { n: 2, label: 'IA analisa',      sub: 'Claude (Anthropic) identifica padrões, outliers e oportunidades' },
            { n: 3, label: 'Insight gerado',  sub: 'Card aparece aqui com contexto, métricas e recomendação' },
          ].map(step => (
            <div key={step.n} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card2)', border: '1px solid var(--border2)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                {step.n}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 3 }}>{step.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450, lineHeight: 1.55 }}>{step.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Section label ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          {isDemo ? 'Exemplos de insights' : 'Insights gerados'}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 450 }}>
          {currentBrand.name}{isDemo ? ' · dados simulados' : ''}
        </span>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {[1,2,3,4].map(i => <InsightSkeleton key={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {displayInsights.map(i => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}

      {/* ── CTA configurar (sem key) ──────────────────────────────────── */}
      {!hasApiKey && (
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 3 }}>Ativar insights reais</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 450 }}>
              Configure a Anthropic API Key em <strong style={{ fontWeight: 600 }}>Configurações → AI & Integrações</strong> para começar.
            </div>
          </div>
          <span style={{ fontSize: 18, color: 'var(--text-muted)', opacity: .5, flexShrink: 0 }}>→</span>
        </div>
      )}
    </div>
  );
}
