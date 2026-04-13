# Antro Dashboard

Dashboard interno de analytics para social media — gerencia múltiplas marcas de memes (South America Memes, Brazilposting, Lixeira Memes) com dados de Instagram, TikTok, YouTube, Twitter/X e Facebook.

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind + Recharts
- **Backend:** PostgreSQL 16 + Prisma ORM
- **Auth:** NextAuth v5 — login exclusivo via Google (@antro.ag)
- **IA:** Anthropic Claude (insights automáticos)

## Pré-requisitos

- Node.js 20+
- Docker Desktop

## Como rodar

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd antro
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<gerar com: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth Client Secret>
ANTHROPIC_API_KEY=<Anthropic API Key>
```

Crie também um `.env` na raiz com:

```env
DATABASE_URL="postgresql://antro:antro2026@localhost:5432/antro"
```

### 3. Subir o banco de dados

```bash
docker compose up -d
```

### 4. Rodar as migrations

```bash
npx prisma migrate deploy
```

### 5. Iniciar o servidor

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Importação de dados

A fonte primária de dados são CSVs exportados de cada plataforma. Acesse **Importações** no dashboard e faça upload do arquivo correspondente à plataforma.

Formatos suportados por plataforma:

| Plataforma | Tipo de dado | Formato de data |
|---|---|---|
| Instagram | Posts individuais | MM/DD/YYYY |
| TikTok | Métricas diárias | pt-BR sem ano |
| YouTube | Posts individuais | Jan 15, 2026 |
| Twitter/X | Métricas diárias | en-US |
| Facebook | Posts individuais | MM/DD/YYYY |

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|---|---|
| `NEXTAUTH_URL` | URL base da aplicação |
| `NEXTAUTH_SECRET` | Secret para assinar JWTs |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID (Google Cloud) |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `DATABASE_URL` | Connection string do PostgreSQL |
| `ANTHROPIC_API_KEY` | API Key para insights com IA (opcional) |
