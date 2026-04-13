'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, PAGE_TITLES, DateRange } from '@/contexts/AppContext';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DAYS_PT = ['D','S','T','Q','Q','S','S'];

// ─── Sprint 5: exportação PDF ─────────────────────────────────────────────────
async function exportReport(brandId: string, from: Date, to: Date, label: string) {
  const params = new URLSearchParams({ brandId, from: from.toISOString(), to: to.toISOString(), label });
  const res = await fetch(`/api/export/report?${params}`);
  if (!res.ok) throw new Error('Falha ao buscar dados do relatório.');
  const { report } = await res.json();

  const kpiRows = report.kpis.map((k: Record<string,string>) => `
    <tr><td><strong>${k.label}</strong></td><td>${k.views}</td><td>${k.reach}</td><td>${k.likes}</td><td>${k.er}</td><td>${k.volume}</td></tr>`).join('');
  const postRows = report.posts.map((p: Record<string,string>, i: number) => `
    <tr><td>${i+1}</td><td><span class="badge">${p.platform}</span></td><td>${p.title.length>55?p.title.slice(0,55)+'…':p.title}</td><td>${p.views}</td><td>${p.likes}</td><td><strong>${p.er}</strong></td><td>${p.date}</td></tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Relatório ${report.brand} — ${report.period}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0c0c0c;background:#fff;padding:36px 40px;font-size:13px}h1{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:4px}.meta{font-size:11px;color:#888;margin-bottom:32px}h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:28px 0 10px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;padding:8px 10px;background:#f5f4f1;font-weight:600;font-size:11px;border-bottom:2px solid #e0ddd6}td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:middle}tr:last-child td{border-bottom:none}.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;background:#f2eee5;color:#343128}.footer{margin-top:36px;font-size:10px;color:#bbb;text-align:center;border-top:1px solid #eee;padding-top:12px}@media print{body{padding:16px 20px}@page{margin:12mm}}</style>
</head><body>
<h1>📊 ${report.brand}</h1>
<div class="meta">Período: <strong>${report.period}</strong> &nbsp;·&nbsp; Gerado em: ${report.generatedAt}</div>
<h2>KPIs por Plataforma</h2>
<table><thead><tr><th>Plataforma</th><th>Views</th><th>Reach</th><th>Likes</th><th>ER Médio</th><th>Volume</th></tr></thead><tbody>${kpiRows}</tbody></table>
${report.posts.length>0?`<h2>Top 10 Posts por Engajamento</h2><table><thead><tr><th>#</th><th>Plataforma</th><th>Título</th><th>Views</th><th>Likes</th><th>ER</th><th>Data</th></tr></thead><tbody>${postRows}</tbody></table>`:''}
<div class="footer">Gerado pelo Antro Dashboard &nbsp;·&nbsp; antro.co</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) throw new Error('Pop-up bloqueado. Permita pop-ups e tente novamente.');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ─── Helpers de range ─────────────────────────────────────────────────────────

function lastNDays(n: number): DateRange {
  const to   = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - n + 1);
  from.setHours(0, 0, 0, 0);
  const label = n === 7 ? 'Últimos 7 dias' : n === 28 ? 'Últimos 28 dias' : n === 90 ? 'Últimos 90 dias' : 'Últimos 365 dias';
  return { from, to, label };
}

function yearRange(year: number): DateRange {
  return {
    from:  new Date(year, 0, 1),
    to:    new Date(year + 1, 0, 1),
    label: String(year),
  };
}

function monthRange(year: number, month: number): DateRange {
  return {
    from:  new Date(year, month, 1),
    to:    new Date(year, month + 1, 1),
    label: `${MONTHS_SHORT[month]} ${year}`,
  };
}

// Extrai anos e meses recentes dos availableMonths
function buildGroups(months: DateRange[]) {
  const years  = new Set<number>();
  const recent: DateRange[] = [];

  // Ordena desc
  const sorted = [...months].sort((a, b) => b.from.getTime() - a.from.getTime());

  sorted.forEach(m => {
    const y = m.from.getFullYear();
    years.add(y);
  });

  // Últimos 4 meses com dados
  sorted.slice(0, 4).forEach(m => recent.push(m));

  return {
    years:  Array.from(years).sort((a, b) => b - a),
    recent,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Header() {
  const {
    page, theme, toggleTheme,
    dateRange, setDateRange,
    currentBrand, currentBrandId,
    availableMonths, setAvailableMonths,
  } = useApp();

  const [open,        setOpen]        = useState(false);
  const [calOpen,     setCalOpen]     = useState(false);
  const [calDate,     setCalDate]     = useState(new Date());
  const [selecting,   setSelecting]   = useState<'start'|'end'>('start');
  const [customStart, setCustomStart] = useState<Date|null>(null);
  const [customEnd,   setCustomEnd]   = useState<Date|null>(null);
  const [exporting,   setExporting]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false); setCalOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const fetchMonths = useCallback(async () => {
    if (!currentBrandId || currentBrandId.startsWith('__')) return;
    try {
      const res = await fetch(`/api/kpis?brandId=${currentBrandId}&action=availableMonths`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.months?.length > 0) {
        const months: DateRange[] = json.months.map((m: { from: string; to: string; label: string }) => ({
          from:  new Date(m.from),
          to:    new Date(m.to),
          label: m.label,
        }));
        setAvailableMonths(months);
      }
    } catch { /* silencioso */ }
  }, [currentBrandId]);

  useEffect(() => { fetchMonths(); }, [fetchMonths]);

  function pick(r: DateRange) {
    setDateRange(r);
    setOpen(false);
    setCalOpen(false);
  }

  function openCustom() {
    setCalOpen(true);
    setSelecting('start');
    setCustomStart(null);
    setCustomEnd(null);
    setCalDate(new Date());
  }

  function selectDay(day: number) {
    const d = new Date(calDate.getFullYear(), calDate.getMonth(), day);
    if (selecting === 'start') {
      setCustomStart(d); setCustomEnd(null); setSelecting('end');
    } else {
      if (customStart && d < customStart) {
        setCustomEnd(customStart); setCustomStart(d);
      } else {
        setCustomEnd(d);
      }
      setSelecting('start');
    }
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    const to = new Date(customEnd);
    to.setDate(to.getDate() + 1);
    pick({
      from: customStart, to,
      label: `${customStart.toLocaleDateString('pt-BR')} – ${customEnd.toLocaleDateString('pt-BR')}`,
    });
  }

  async function handleExport() {
    if (!currentBrandId || currentBrandId.startsWith('__')) { alert('Selecione uma marca antes de exportar.'); return; }
    setExporting(true);
    try { await exportReport(currentBrandId, dateRange.from, dateRange.to, dateRange.label); }
    catch (err) { alert(`Erro ao gerar relatório:\n${String(err)}`); }
    finally { setExporting(false); }
  }

  function renderCalendar() {
    const year = calDate.getFullYear(), month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isStart = customStart && date.toDateString() === customStart.toDateString();
      const isEnd   = customEnd   && date.toDateString() === customEnd.toDateString();
      const inRange = customStart && customEnd && date > customStart && date < customEnd;
      let bg = 'transparent', color = 'var(--text-muted)', fw = 500;
      if (isStart || isEnd) { bg = 'var(--text)'; color = 'var(--bg)'; fw = 700; }
      else if (inRange)     { bg = 'rgba(242,238,229,.1)'; color = 'var(--text)'; }
      cells.push(
        <div key={d} onClick={() => selectDay(d)} style={{ fontSize:11, fontWeight:fw, textAlign:'center', padding:'5px 2px', borderRadius:4, cursor:'pointer', background:bg, color, transition:'all .1s' }}>{d}</div>
      );
    }
    return cells;
  }

  const { years, recent } = buildGroups(availableMonths);

  // ─── Estilos ──────────────────────────────────────────────────────────────
  const periodBtnStyle: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:7,
    padding:'7px 14px',
    background:'rgba(242,238,229,.06)',
    border:'1px solid var(--border2)',
    borderRadius:'var(--radius)',
    color:'var(--sb-text)',
    fontSize:11.5, fontWeight:500, letterSpacing:'.01em',
    cursor:'pointer', transition:'all .15s',
  };

  const iconBtnStyle: React.CSSProperties = {
    width:32, height:32,
    background:'rgba(242,238,229,.06)',
    border:'1px solid var(--border2)',
    borderRadius:'var(--radius)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:14, cursor:'pointer',
    transition:'background .15s',
    color:'var(--sb-text)',
  };

  // Item do dropdown
  function DropItem({ label, active, onClick, muted }: { label: string; active?: boolean; onClick: () => void; muted?: boolean }) {
    const [hover, setHover] = useState(false);
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding:'9px 16px', fontSize:12, cursor:'pointer',
          fontWeight: active ? 600 : 450,
          color: active ? 'var(--text)' : muted ? 'var(--text-dim)' : 'var(--text-muted)',
          background: hover ? 'var(--bg-card2)' : 'transparent',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          transition:'all .1s',
        }}
      >
        <span>{label}</span>
        {active && <span style={{ fontSize:10, opacity:.6 }}>✓</span>}
      </div>
    );
  }

  function Divider({ label }: { label?: string }) {
    return (
      <div style={{ padding: label ? '10px 16px 4px' : '4px 0', borderTop: label ? 'none' : '1px solid var(--border)' }}>
        {label && <div style={{ fontSize:9, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</div>}
      </div>
    );
  }

  return (
    <header style={{
      height:'var(--header-h)',
      background:'var(--sb-bg)',
      borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 28px', flexShrink:0, gap:12,
    }}>

      {/* Esquerda */}
      <div style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:650, letterSpacing:'-.01em', color:'var(--sb-text)' }}>
          {PAGE_TITLES[page]}
        </div>
        <div style={{ fontSize:10.5, color:'var(--sb-muted)', fontWeight:450, letterSpacing:'.01em', opacity:.8 }}>
          {dateRange.label} · {currentBrand.name}
        </div>
      </div>

      {/* Direita */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>

        {/* Toggle tema */}
        <button onClick={toggleTheme} style={iconBtnStyle}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

        {/* Exportar PDF */}
        <button onClick={handleExport} disabled={exporting} title="Exportar relatório" style={{ ...iconBtnStyle, fontSize:13, opacity:exporting?.5:1, cursor:exporting?'wait':'pointer' }}>
          {exporting ? '⏳' : '⬇'}
        </button>

        {/* Seletor de período */}
        <div style={{ position:'relative' }} ref={dropRef}>
          <button style={periodBtnStyle} onClick={() => { setOpen(o => !o); setCalOpen(false); }}>
            <span>{dateRange.label}</span>
            <span style={{ fontSize:9, color:'var(--sb-muted)', opacity:.7 }}>▾</span>
          </button>

          {open && (
            <div style={{
              position:'absolute', top:'calc(100% + 6px)', right:0,
              background:'var(--bg-card)', border:'1px solid var(--border2)',
              borderRadius:'var(--radius)', zIndex:200, minWidth:210, overflow:'hidden',
              boxShadow:'0 8px 24px rgba(0,0,0,.25)',
            }}>

              {/* Atalhos rápidos */}
              {[7, 28, 90, 365].map(n => (
                <DropItem
                  key={n}
                  label={n === 7 ? 'Últimos 7 dias' : n === 28 ? 'Últimos 28 dias' : n === 90 ? 'Últimos 90 dias' : 'Últimos 365 dias'}
                  active={dateRange.label === lastNDays(n).label}
                  onClick={() => pick(lastNDays(n))}
                />
              ))}
              <DropItem
                label="Todo o período"
                active={dateRange.label === 'Todo o período'}
                onClick={() => {
                  const sorted = [...availableMonths].sort((a, b) => a.from.getTime() - b.from.getTime());
                  const from = sorted[0]?.from ?? new Date();
                  const to   = sorted[sorted.length - 1]?.to ?? new Date();
                  pick({ from, to, label: 'Todo o período' });
                }}
              />

              {/* Anos */}
              {years.length > 0 && (
                <>
                  <Divider />
                  <Divider label="Ano" />
                  {years.map(y => (
                    <DropItem
                      key={y}
                      label={String(y)}
                      active={dateRange.label === String(y)}
                      onClick={() => pick(yearRange(y))}
                    />
                  ))}
                </>
              )}

              {/* Meses recentes */}
              {recent.length > 0 && (
                <>
                  <Divider />
                  <Divider label="Mês" />
                  {recent.map((m, i) => (
                    <DropItem
                      key={i}
                      label={m.label}
                      active={dateRange.label === m.label}
                      onClick={() => pick(m)}
                    />
                  ))}
                </>
              )}

              {/* Personalizado */}
              <Divider />
              <DropItem label="Personalizado..." onClick={openCustom} muted />

              {/* Calendário inline */}
              {calOpen && (
                <div style={{ padding:'12px 14px 14px', borderTop:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:8, fontWeight:450, textAlign:'center' }}>
                    {selecting === 'start' ? 'Selecione o início' : 'Selecione o fim'}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:14, padding:'2px 6px', borderRadius:4, cursor:'pointer' }}>‹</button>
                    <span style={{ fontSize:11.5, fontWeight:650, color:'var(--text)' }}>{MONTHS_PT[calDate.getMonth()]} {calDate.getFullYear()}</span>
                    <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:14, padding:'2px 6px', borderRadius:4, cursor:'pointer' }}>›</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                    {DAYS_PT.map((d, i) => (
                      <div key={i} style={{ fontSize:9, fontWeight:600, color:'var(--text-dim)', textAlign:'center', padding:'4px 0', textTransform:'uppercase', letterSpacing:'.06em' }}>{d}</div>
                    ))}
                    {renderCalendar()}
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button onClick={() => setCalOpen(false)} style={{ flex:1, padding:7, borderRadius:'var(--radius)', fontSize:11, fontWeight:500, fontFamily:'var(--font)', cursor:'pointer', background:'var(--bg-card2)', color:'var(--text-muted)', border:'1px solid var(--border2)' }}>
                      Cancelar
                    </button>
                    <button onClick={applyCustom} disabled={!customStart||!customEnd} style={{ flex:1, padding:7, borderRadius:'var(--radius)', fontSize:11, fontWeight:600, fontFamily:'var(--font)', cursor:'pointer', background:'var(--text)', color:'var(--bg)', border:'none', opacity:(!customStart||!customEnd)?0.35:1 }}>
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
