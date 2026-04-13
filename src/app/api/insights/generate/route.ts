import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/require-auth';

// POST /api/insights/generate
// Body: { brandId, from, to }
// Busca KPIs do período, manda para o Claude, retorna insights estruturados.

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'] as const;

async function getKpiSummary(brandId: string, from: Date, to: Date): Promise<string> {
  const lines: string[] = [];

  for (const plt of PLATFORMS) {
    const usesDaily = plt === 'tiktok' || plt === 'twitter';

    if (usesDaily) {
      const r = await prisma.dailyMetric.aggregate({
        where: { brandId, platform: plt, date: { gte: from, lt: to } },
        _sum:  { views: true, likes: true, reach: true, impressions: true },
        _avg:  { er: true },
        _count: { id: true },
      });
      if (r._count.id > 0) {
        lines.push(`${plt.toUpperCase()}: views=${r._sum.views ?? 0}, reach=${r._sum.reach ?? 0}, likes=${r._sum.likes ?? 0}, er_avg=${(r._avg.er ?? 0).toFixed(2)}%, days=${r._count.id}`);
      }
    } else {
      const r = await prisma.post.aggregate({
        where: { brandId, platform: plt, date: { gte: from, lt: to } },
        _sum:  { views: true, likes: true, reach: true, comments: true, shares: true },
        _avg:  { er: true },
        _count: { id: true },
      });
      if (r._count.id > 0) {
        lines.push(`${plt.toUpperCase()}: views=${r._sum.views ?? 0}, reach=${r._sum.reach ?? 0}, likes=${r._sum.likes ?? 0}, comments=${r._sum.comments ?? 0}, shares=${r._sum.shares ?? 0}, er_avg=${(r._avg.er ?? 0).toFixed(2)}%, posts=${r._count.id}`);
      }
    }

    // Top 3 posts por ER
    if (plt !== 'tiktok' && plt !== 'twitter') {
      const top = await prisma.post.findMany({
        where: { brandId, platform: plt, date: { gte: from, lt: to } },
        orderBy: { er: 'desc' },
        take: 3,
        select: { postType: true, er: true, views: true, title: true },
      });
      if (top.length > 0) {
        const topStr = top.map(p => `${p.postType ?? 'post'} ER=${p.er.toFixed(1)}% views=${p.views}`).join(', ');
        lines.push(`  ${plt} top posts: ${topStr}`);
      }
    }
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'Nenhum dado disponível para o período.';
}

export async function POST(req: NextRequest) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada. Adicione em Configurações.' }, { status: 400 });
    }

    const body = await req.json();
    const { brandId, from: fromStr, to: toStr } = body as {
      brandId: string; from: string; to: string;
    };

    if (!brandId || !fromStr || !toStr) {
      return NextResponse.json({ error: 'brandId, from e to obrigatórios' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to   = new Date(toStr);

    // Busca dados do banco
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
    const kpiSummary = await getKpiSummary(brandId, from, to);

    // Prepara prompt
    const prompt = `Você é um analista de social media especializado em meme brands brasileiras.

Analise os dados abaixo de ${brand?.name ?? brandId} e gere exatamente 4 insights acionáveis em JSON.

DADOS DO PERÍODO (${from.toLocaleDateString('pt-BR')} – ${to.toLocaleDateString('pt-BR')}):
${kpiSummary}

Responda SOMENTE com um array JSON válido, sem markdown, sem texto extra. Formato:
[
  {
    "platform": "instagram|tiktok|youtube|twitter|facebook",
    "type": "performance|trend|alert|opportunity",
    "title": "Título curto do insight (máx 50 chars)",
    "body": "Explicação do insight com contexto e recomendação (máx 200 chars)",
    "delta": "+12%",
    "deltaLabel": "descrição da métrica",
    "tag": "Conteúdo|Horário|Alerta|Oportunidade|Formato|Crescimento"
  }
]

Priorize insights com dados concretos. Se uma plataforma não tiver dados, ignore-a.`;

    // Chama a API do Claude
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    });

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    // Parse JSON — remove possíveis backticks residuais
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as Array<{
      platform: string; type: string; title: string;
      body: string; delta: string; deltaLabel: string; tag: string;
    }>;

    // Adiciona campos de display e marca como reais
    const insights = parsed.map((ins, i) => ({
      id:         `ai_${Date.now()}_${i}`,
      ...ins,
      age:        'agora',
      isReal:     true,
    }));

    // Persiste no banco — deleta insights anteriores do mesmo período antes de inserir
    await prisma.insight.deleteMany({
      where: { brandId, fromDate: { lte: to }, toDate: { gte: from } },
    });

    await prisma.insight.createMany({
      data: parsed.map(ins => ({
        brandId,
        platform:   ins.platform ?? 'overview',
        type:       ins.type     ?? 'performance',
        title:      ins.title    ?? '',
        body:       ins.body     ?? '',
        delta:      ins.delta    ?? '',
        deltaLabel: ins.deltaLabel ?? '',
        tag:        ins.tag      ?? '',
        fromDate:   from,
        toDate:     to,
      })),
    });

    return NextResponse.json({ ok: true, insights, tokensUsed: message.usage });

  } catch (err) {
    console.error('[insights/generate]', err);
    const msg = err instanceof SyntaxError
      ? 'Resposta da IA não era JSON válido. Tente novamente.'
      : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
