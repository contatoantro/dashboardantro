// ═══════════════════════════════════════════════
//  MOCK DATA — espelha exatamente o v5.html
// ═══════════════════════════════════════════════

export const PLT_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  tiktok:    '#69C9D0',
  youtube:   '#FF0000',
  twitter:   '#1DA1F2',
  facebook:  '#1877F2',
};

export interface PlatformConfig {
  label:      string;
  color:      string;
  emoji:      string;
  kpis:       string[];
  kpiNoScale: boolean[];
  charts:     string[];
  spans:      number[];
  note:       string | null;
}

export const PLT: Record<string, PlatformConfig> = {
  instagram: {
    label: 'Instagram', color: '#E1306C', emoji: '📸',
    kpis:       ['Seguidores', 'Views', 'Alcance', 'ER', 'Posts'],
    kpiNoScale: [false, false, false, true, false],
    charts:     ['views', 'er', 'reach', 'types', 'hours'],
    spans:      [3, 3, 2, 2, 2],
    note:       null,
  },
  tiktok: {
    label: 'TikTok', color: '#69C9D0', emoji: '🎵',
    kpis:       ['Seguidores', 'Views', 'Curtidas', 'ER', 'Posts'],
    kpiNoScale: [false, false, false, true, false],
    charts:     ['views', 'er', 'reach', 'video_len'],
    spans:      [3, 3, 3, 3],
    note:       'TikTok fornece apenas métricas diárias por conta — dados de posts individuais não disponíveis.',
  },
  youtube: {
    label: 'YouTube', color: '#FF0000', emoji: '▶',
    kpis:       ['Inscritos', 'Views', 'Watch Time', 'ER', 'Vídeos'],
    kpiNoScale: [false, false, false, true, false],
    charts:     ['views', 'er', 'watch_time', 'subs'],
    spans:      [3, 3, 3, 3],
    note:       null,
  },
  twitter: {
    label: 'Twitter/X', color: '#1DA1F2', emoji: '𝕏',
    kpis:       ['Seguidores', 'Impressões', 'Alcance', 'ER', 'Tweets'],
    kpiNoScale: [false, false, false, true, false],
    charts:     ['impressions', 'er', 'retweets'],
    spans:      [3, 3, 6],
    note:       'Twitter/X não fornece dados por tweet individual via exportação CSV. Exibindo métricas diárias.',
  },
  facebook: {
    label: 'Facebook', color: '#1877F2', emoji: '𝑓',
    kpis:       ['Seguidores', 'Alcance', 'Reações', 'ER', 'Posts'],
    kpiNoScale: [false, false, false, true, false],
    charts:     ['views', 'er', 'reactions', 'reach'],
    spans:      [3, 3, 3, 3],
    note:       null,
  },
};

export const CHART_TITLES: Record<string, string> = {
  views:       'Views ao longo do tempo',
  er:          'Engagement Rate (%)',
  reach:       'Alcance',
  types:       'Tipos de conteúdo',
  hours:       'Melhores horários',
  video_len:   'Duração dos vídeos',
  watch_time:  'Watch Time (h)',
  subs:        'Crescimento de inscritos',
  impressions: 'Impressões diárias',
  retweets:    'Retweets & Curtidas',
  reactions:   'Reações',
};

export type PeriodKey = 'day' | 'week' | 'month';

export const KPI_BASE: Record<string, Record<PeriodKey, string[]>> = {
  overview:  { day:['2.6M','870K','26','4.31%','8.2M'],    week:['18.2M','6.1M','183','4.12%','8.2M'],   month:['79.4M','27.3M','798','3.94%','8.2M'] },
  instagram: { day:['3.4M','1.1M','398K','5.3%','10'],     week:['3.4M','7.9M','2.8M','5.1%','72'],      month:['3.4M','34.2M','12.1M','4.8%','312'] },
  tiktok:    { day:['2.8M','940K','311K','3.7%','6'],      week:['2.8M','6.6M','2.2M','3.5%','43'],      month:['2.8M','28.7M','9.4M','3.2%','189'] },
  youtube:   { day:['1.2M','298K','102K','2.4%','2'],      week:['1.2M','2.1M','720K','2.3%','11'],      month:['1.2M','8.9M','3.1M','2.1%','48'] },
  twitter:   { day:['520K','171K','59K','2.1%','6'],       week:['520K','1.2M','420K','2.0%','43'],      month:['520K','5.2M','1.8M','1.9%','187'] },
  facebook:  { day:['287K','79K','29K','1.6%','2'],        week:['287K','555K','207K','1.5%','14'],      month:['287K','2.4M','890K','1.4%','62'] },
};

export const CLABELS: Record<PeriodKey, string[]> = {
  day:   ['8h','10h','12h','14h','16h','18h','20h','22h'],
  week:  ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
  month: ['1','5','10','15','20','25','30'],
};

// Dados de chart — time-series têm { day, week, month }, estáticos têm { labels, data }
export type ChartSeries = { day: number[]; week: number[]; month: number[] };
export type ChartStatic = { labels: string[]; data: number[] };
export type ChartData   = ChartSeries | ChartStatic;

export const CDATA: Record<string, Record<string, ChartData>> = {
  instagram: {
    views:     { day:[89,118,145,162,148,131,110,94],          week:[1.1,1.8,1.4,2.2,1.9,2.6,1.7],        month:[3.2,4.4,5.9,4.8,6.3,5.5,4.7] },
    er:        { day:[4.1,4.9,5.4,5.2,5.0,5.3,4.7,5.1],       week:[4.8,5.3,4.9,5.5,5.0,4.6,5.4],        month:[4.6,4.9,5.2,4.8,5.3,4.9,5.0] },
    reach:     { day:[62,83,101,113,104,91,77,65],             week:[0.8,1.3,1.0,1.6,1.4,1.9,1.2],        month:[2.3,3.1,4.2,3.4,4.5,3.9,3.4] },
    types:     { labels:['Reels','Carrossel','Foto','Stories'], data:[52,28,12,8] },
    hours:     { labels:['8h','10h','12h','14h','16h','18h','20h','22h'], data:[42,58,71,84,79,91,88,62] },
  },
  tiktok: {
    views:     { day:[156,201,278,312,289,241,198,167],         week:[1.8,2.4,2.0,3.1,2.7,3.6,2.3],        month:[4.1,5.8,7.2,6.3,8.1,7.0,5.9] },
    er:        { day:[2.9,3.5,3.8,3.6,3.4,3.7,3.2,3.5],       week:[3.2,3.6,3.3,3.9,3.5,3.0,3.7],        month:[3.1,3.3,3.6,3.2,3.7,3.3,3.4] },
    reach:     { day:[48,62,81,94,87,72,59,51],                week:[0.6,0.8,0.7,1.1,0.9,1.3,0.8],        month:[1.4,2.0,2.5,2.1,2.8,2.4,2.0] },
    video_len: { labels:['<15s','15-30s','30-60s','1-3min','>3min'], data:[38,31,20,8,3] },
  },
  youtube: {
    views:      { day:[22,31,45,58,51,43,36,28],               week:[0.3,0.5,0.4,0.7,0.6,0.8,0.5],        month:[0.9,1.3,1.8,1.5,2.0,1.7,1.4] },
    er:         { day:[1.9,2.3,2.6,2.4,2.2,2.5,2.1,2.3],      week:[2.1,2.4,2.2,2.6,2.3,2.0,2.4],        month:[2.0,2.2,2.4,2.1,2.5,2.2,2.3] },
    watch_time: { day:[3.2,4.6,6.8,8.4,7.4,6.1,5.1,4.0],      week:[42,68,55,91,78,104,67],               month:[121,178,245,201,271,234,192] },
    subs:       { day:[120,180,250,310,280,230,190,150],        week:[1.4,2.2,1.8,2.9,2.5,3.2,2.1],        month:[6.1,8.4,11.2,9.5,13.1,11.4,9.8] },
  },
  twitter: {
    impressions: { day:[28,37,51,62,55,47,41,33],              week:[0.4,0.6,0.5,0.8,0.7,0.9,0.6],        month:[1.3,1.8,2.4,2.0,2.6,2.2,1.9] },
    er:          { day:[1.7,2.0,2.3,2.1,2.0,2.2,1.9,2.1],     week:[1.9,2.1,2.0,2.3,2.1,1.8,2.2],        month:[1.8,2.0,2.2,1.9,2.2,2.0,2.1] },
    retweets:    { day:[18,24,33,41,36,30,26,21],              week:[0.2,0.4,0.3,0.5,0.4,0.6,0.4],        month:[0.8,1.2,1.6,1.3,1.7,1.4,1.2] },
  },
  facebook: {
    views:     { day:[9,13,18,22,19,16,13,11],                 week:[0.1,0.2,0.14,0.21,0.18,0.24,0.16],   month:[0.4,0.6,0.8,0.65,0.9,0.75,0.65] },
    er:        { day:[1.2,1.5,1.7,1.6,1.5,1.6,1.4,1.5],       week:[1.4,1.6,1.5,1.7,1.5,1.3,1.6],        month:[1.3,1.5,1.6,1.4,1.6,1.5,1.5] },
    reactions: { day:[42,57,79,93,82,69,57,47],                week:[0.5,0.8,0.6,0.9,0.8,1.1,0.7],        month:[1.8,2.5,3.3,2.7,3.6,3.1,2.6] },
    reach:     { day:[7,10,14,17,15,13,10,8],                  week:[0.08,0.13,0.10,0.16,0.14,0.19,0.12], month:[0.3,0.4,0.6,0.5,0.7,0.58,0.49] },
  },
};

// ═══════════════════════════════════════════════
//  POSTS
// ═══════════════════════════════════════════════

export interface Post {
  id:       string;
  type:     string;
  caption:  string;
  date:     string;
  views_n:  number;
  likes_n:  number;
  er_n:     number;
  views:    string;
  likes:    string;
  comments: string;
  shares:   string;
  er:       string;
  reach:    string;
  url:      string;
  rank:     'top' | 'mid' | 'bottom';
  platform: string;
  trends:   { views: number; likes: number; shares: number; er: number };
}

export const POSTS: Record<string, Post[]> = {
  instagram: [
    { id:'ig1', platform:'instagram', type:'Reel',      caption:'Quando o gringo descobre o Brasil 🇧🇷',      date:'31/01', views_n:1240000, likes_n:89300,  er_n:5.8, views:'1.24M', likes:'89.3K', comments:'4.2K', shares:'12.1K', er:'5.8%', reach:'987K',  url:'https://instagram.com', rank:'top',    trends:{views:18,  likes:12,  shares:31,  er:0.6} },
    { id:'ig2', platform:'instagram', type:'Carrossel', caption:'Top 10 memes que definiram 2025',            date:'28/01', views_n:892000,  likes_n:67100,  er_n:4.9, views:'892K',  likes:'67.1K', comments:'3.1K', shares:'8.9K',  er:'4.9%', reach:'743K',  url:'https://instagram.com', rank:'top',    trends:{views:9,   likes:7,   shares:14,  er:0.3} },
    { id:'ig3', platform:'instagram', type:'Reel',      caption:'POV: explicando o Bolsonaro para americano', date:'25/01', views_n:741000,  likes_n:54200,  er_n:4.7, views:'741K',  likes:'54.2K', comments:'6.8K', shares:'7.4K',  er:'4.7%', reach:'612K',  url:'https://instagram.com', rank:'mid',    trends:{views:4,   likes:3,   shares:8,   er:0.1} },
    { id:'ig4', platform:'instagram', type:'Foto',      caption:'Meme do dia: segunda-feira mode',             date:'22/01', views_n:289000,  likes_n:18400,  er_n:2.1, views:'289K',  likes:'18.4K', comments:'612',  shares:'2.1K',  er:'2.1%', reach:'238K',  url:'https://instagram.com', rank:'mid',    trends:{views:-8,  likes:-11, shares:-4,  er:-0.3} },
    { id:'ig5', platform:'instagram', type:'Carrossel', caption:'Ranking dos estados brasileiros por meme',   date:'18/01', views_n:198000,  likes_n:12100,  er_n:1.8, views:'198K',  likes:'12.1K', comments:'441',  shares:'1.4K',  er:'1.8%', reach:'164K',  url:'https://instagram.com', rank:'mid',    trends:{views:-14, likes:-18, shares:-9,  er:-0.6} },
    { id:'ig6', platform:'instagram', type:'Story',     caption:'Poll: você prefere churrasco ou pizza?',     date:'15/01', views_n:43000,   likes_n:2100,   er_n:0.9, views:'43K',   likes:'2.1K',  comments:'89',   shares:'234',   er:'0.9%', reach:'38K',   url:'https://instagram.com', rank:'bottom', trends:{views:-28, likes:-31, shares:-22, er:-1.1} },
  ],
  tiktok: [
    { id:'tt1', platform:'tiktok', type:'Diário', caption:'01/02/2026', date:'01/02', views_n:1800000, likes_n:124000, er_n:4.2, views:'1.8M',  likes:'124K', comments:'8.4K', shares:'31K',  er:'4.2%', reach:'1.4M', url:'https://tiktok.com', rank:'top',    trends:{views:22,  likes:19,  shares:34,  er:0.8} },
    { id:'tt2', platform:'tiktok', type:'Diário', caption:'28/01/2026', date:'28/01', views_n:1200000, likes_n:89000,  er_n:3.8, views:'1.2M',  likes:'89K',  comments:'5.9K', shares:'21K',  er:'3.8%', reach:'960K', url:'https://tiktok.com', rank:'top',    trends:{views:8,   likes:6,   shares:12,  er:0.2} },
    { id:'tt3', platform:'tiktok', type:'Diário', caption:'20/01/2026', date:'20/01', views_n:284000,  likes_n:18000,  er_n:2.1, views:'284K',  likes:'18K',  comments:'1.1K', shares:'4.2K', er:'2.1%', reach:'226K', url:'https://tiktok.com', rank:'mid',    trends:{views:-9,  likes:-12, shares:-5,  er:-0.4} },
    { id:'tt4', platform:'tiktok', type:'Diário', caption:'12/01/2026', date:'12/01', views_n:198000,  likes_n:11000,  er_n:1.7, views:'198K',  likes:'11K',  comments:'720',  shares:'2.8K', er:'1.7%', reach:'158K', url:'https://tiktok.com', rank:'bottom', trends:{views:-21, likes:-24, shares:-14, er:-0.9} },
  ],
  youtube: [
    { id:'yt1', platform:'youtube', type:'Vídeo',  caption:'Os 50 memes que definiram 2025',            date:'29/01', views_n:892000, likes_n:41200, er_n:3.2, views:'892K', likes:'41.2K', comments:'3.8K', shares:'9.1K', er:'3.2%', reach:'712K', url:'https://youtube.com', rank:'top',    trends:{views:24,  likes:18,  shares:29,  er:0.7} },
    { id:'yt2', platform:'youtube', type:'Shorts', caption:'Gringo tentando falar português por 10 min', date:'24/01', views_n:641000, likes_n:29400, er_n:2.9, views:'641K', likes:'29.4K', comments:'2.1K', shares:'6.2K', er:'2.9%', reach:'513K', url:'https://youtube.com', rank:'top',    trends:{views:11,  likes:9,   shares:16,  er:0.3} },
    { id:'yt3', platform:'youtube', type:'Vídeo',  caption:'História do meme no Brasil (parte 3)',       date:'17/01', views_n:312000, likes_n:14200, er_n:2.2, views:'312K', likes:'14.2K', comments:'987',  shares:'3.1K', er:'2.2%', reach:'249K', url:'https://youtube.com', rank:'mid',    trends:{views:-3,  likes:-4,  shares:-1,  er:-0.1} },
    { id:'yt4', platform:'youtube', type:'Vídeo',  caption:'Reação: memes internacionais explicados',    date:'08/01', views_n:89000,  likes_n:3200,  er_n:0.8, views:'89K',  likes:'3.2K',  comments:'211',  shares:'712',  er:'0.8%', reach:'71K',  url:'https://youtube.com', rank:'bottom', trends:{views:-19, likes:-23, shares:-12, er:-0.7} },
  ],
  twitter: [
    { id:'tw1', platform:'twitter', type:'Diário', caption:'01/02/2026', date:'01/02', views_n:321000, likes_n:12400, er_n:3.1, views:'321K', likes:'12.4K', comments:'2.1K', shares:'8.9K', er:'3.1%', reach:'257K', url:'https://twitter.com', rank:'top',    trends:{views:16,  likes:14,  shares:22,  er:0.5} },
    { id:'tw2', platform:'twitter', type:'Diário', caption:'26/01/2026', date:'26/01', views_n:218000, likes_n:8900,  er_n:2.4, views:'218K', likes:'8.9K',  comments:'1.4K', shares:'5.8K', er:'2.4%', reach:'174K', url:'https://twitter.com', rank:'top',    trends:{views:7,   likes:5,   shares:11,  er:0.2} },
    { id:'tw3', platform:'twitter', type:'Diário', caption:'18/01/2026', date:'18/01', views_n:62000,  likes_n:2100,  er_n:1.2, views:'62K',  likes:'2.1K',  comments:'312',  shares:'1.4K', er:'1.2%', reach:'49K',  url:'https://twitter.com', rank:'mid',    trends:{views:-8,  likes:-11, shares:-4,  er:-0.3} },
    { id:'tw4', platform:'twitter', type:'Diário', caption:'09/01/2026', date:'09/01', views_n:38000,  likes_n:1100,  er_n:0.8, views:'38K',  likes:'1.1K',  comments:'189',  shares:'812',  er:'0.8%', reach:'30K',  url:'https://twitter.com', rank:'bottom', trends:{views:-22, likes:-28, shares:-15, er:-0.8} },
  ],
  facebook: [
    { id:'fb1', platform:'facebook', type:'Vídeo',     caption:'Compilação: memes sul-americanos de janeiro', date:'30/01', views_n:312000, likes_n:18400, er_n:2.8, views:'312K', likes:'18.4K', comments:'1.2K', shares:'4.8K', er:'2.8%', reach:'249K', url:'https://facebook.com', rank:'top',    trends:{views:13,  likes:10,  shares:18,  er:0.4} },
    { id:'fb2', platform:'facebook', type:'Carrossel', caption:'Top memes da semana — vote no favorito',      date:'24/01', views_n:218000, likes_n:12100, er_n:2.1, views:'218K', likes:'12.1K', comments:'814',  shares:'3.1K', er:'2.1%', reach:'174K', url:'https://facebook.com', rank:'top',    trends:{views:5,   likes:4,   shares:9,   er:0.1} },
    { id:'fb3', platform:'facebook', type:'Foto',      caption:'Meme da segunda',                             date:'17/01', views_n:58000,  likes_n:2800,  er_n:1.2, views:'58K',  likes:'2.8K',  comments:'189',  shares:'712',  er:'1.2%', reach:'46K',  url:'https://facebook.com', rank:'mid',    trends:{views:-9,  likes:-12, shares:-5,  er:-0.3} },
    { id:'fb4', platform:'facebook', type:'Foto',      caption:'Boa tarde amigos',                            date:'09/01', views_n:21000,  likes_n:891,   er_n:0.6, views:'21K',  likes:'891',   comments:'62',   shares:'241',  er:'0.6%', reach:'16K',  url:'https://facebook.com', rank:'bottom', trends:{views:-24, likes:-28, shares:-16, er:-0.8} },
  ],
};

export const ALL_POSTS: Post[] = Object.values(POSTS).flat();

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

export function scaleKPI(val: string, mult: number, noScale = false): string {
  if (noScale || val.includes('%') || val === '—') return val;
  const m = val.match(/^([\d.]+)([KMB]?)$/);
  if (!m) return val;
  const num = parseFloat(m[1]) * mult;
  const suffix = m[2];
  if (suffix === 'M') return num.toFixed(1) + 'M';
  if (suffix === 'K') return num >= 1000 ? (num / 1000).toFixed(1) + 'M' : Math.round(num) + 'K';
  if (suffix === 'B') return num.toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return Math.round(num).toString();
}

export function formatNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function applyMult(arr: number[], mult: number): number[] {
  return arr.map(v => +(v * mult).toFixed(1));
}
