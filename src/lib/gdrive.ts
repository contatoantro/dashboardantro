// src/lib/gdrive.ts
// Cliente Google Drive autenticado via Service Account.
// Requer variável GOOGLE_SERVICE_ACCOUNT_JSON no .env.local com o JSON completo
// da credencial (em uma única linha, ou como string JSON escapada).

import { google } from 'googleapis';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DriveFile {
  id:       string;
  name:     string;
  mimeType: string;
  size:     string;
  modifiedTime: string;
  md5Checksum?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não configurada no .env.local');
  }

  let credentials: object;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido');
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

// ─── Funções públicas ─────────────────────────────────────────────────────────

// Lista todos os CSVs de uma pasta do Drive
export async function listCsvFiles(folderId: string): Promise<DriveFile[]> {
  const auth  = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q:          `'${folderId}' in parents and mimeType = 'text/csv' and trashed = false`,
    fields:     'files(id, name, mimeType, size, modifiedTime, md5Checksum)',
    orderBy:    'modifiedTime desc',
    pageSize:   100,
  });

  return (res.data.files ?? []) as DriveFile[];
}

// Baixa conteúdo de um arquivo do Drive como texto
export async function downloadFileAsText(fileId: string): Promise<string> {
  const auth  = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  // Tenta UTF-8, fallback para latin1 (CSVs do Meta às vezes vêm em latin1)
  const buffer = Buffer.from(res.data as ArrayBuffer);
  try {
    const text = buffer.toString('utf-8');
    // Verifica se o decode fez sentido (sem caracteres de substituição em excesso)
    if ((text.match(/\uFFFD/g) ?? []).length < 5) return text;
  } catch { /* continua */ }

  return buffer.toString('latin1');
}

// Verifica se a integração está configurada
export function isDriveConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
}
