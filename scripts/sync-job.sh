#!/bin/bash
# scripts/sync-job.sh
# Chama a API de sync do Google Drive para cada brand configurada.
# Rode via crontab: crontab -e → adicione a linha abaixo:
#
#   0 */6 * * * /caminho/do/projeto/scripts/sync-job.sh >> /var/log/antro-sync.log 2>&1
#
# Isso executa o sync a cada 6 horas.

set -euo pipefail

# ── Configuração ──────────────────────────────────────────────────────────────

APP_URL="${APP_URL:-http://localhost:3000}"
SYNC_SECRET="${SYNC_SECRET:-}"   # opcional: header de autenticação para a rota
LOG_PREFIX="[antro-sync] $(date '+%Y-%m-%d %H:%M:%S')"

# IDs das brands para sincronizar (separe por espaço se tiver mais de uma)
# Encontre o ID no banco: SELECT id, name FROM "Brand";
BRAND_IDS="${BRAND_IDS:-}"

# ── Validações ────────────────────────────────────────────────────────────────

if [ -z "$BRAND_IDS" ]; then
  echo "$LOG_PREFIX ERROR: BRAND_IDS não configurado. Defina no .env ou no próprio script."
  exit 1
fi

# ── Execução ──────────────────────────────────────────────────────────────────

echo "$LOG_PREFIX Iniciando sync Google Drive → $APP_URL"

for BRAND_ID in $BRAND_IDS; do
  echo "$LOG_PREFIX Sincronizando brand: $BRAND_ID"

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$APP_URL/api/gdrive/sync" \
    -H "Content-Type: application/json" \
    ${SYNC_SECRET:+-H "x-sync-secret: $SYNC_SECRET"} \
    -d "{\"brandId\": \"$BRAND_ID\"}" \
    --max-time 120)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "200" ]; then
    IMPORTED=$(echo "$BODY" | grep -o '"imported":[0-9]*' | grep -o '[0-9]*' || echo "?")
    SKIPPED=$(echo  "$BODY" | grep -o '"skipped":[0-9]*'  | grep -o '[0-9]*' || echo "?")
    echo "$LOG_PREFIX ✓ Brand $BRAND_ID — importados: $IMPORTED, pulados: $SKIPPED"
  else
    echo "$LOG_PREFIX ✗ Brand $BRAND_ID — HTTP $HTTP_CODE — $BODY"
  fi
done

echo "$LOG_PREFIX Sync concluído."
