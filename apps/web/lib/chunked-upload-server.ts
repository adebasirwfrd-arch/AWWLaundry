import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { storeUploadedFile } from './object-storage';
import { UPLOAD_CATEGORY_DIRS, type UploadCategory } from './chunked-upload-shared';

const TMP_ROOT = path.join(process.cwd(), 'tmp', 'upload-chunks');

function uploadDir(uploadId: string) {
  return path.join(TMP_ROOT, uploadId);
}

function metaPath(uploadId: string) {
  return path.join(uploadDir(uploadId), 'meta.json');
}

interface UploadMeta {
  category: UploadCategory;
  fileName: string;
  mime: string;
  totalChunks: number;
  received: number[];
}

export async function storeUploadChunk(input: {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  category: UploadCategory;
  fileName: string;
  mime: string;
  bytes: Buffer;
}) {
  if (!input.uploadId || input.totalChunks < 1 || input.chunkIndex < 0 || input.chunkIndex >= input.totalChunks) {
    throw new Error('Data chunk tidak valid');
  }

  const dir = uploadDir(input.uploadId);
  await mkdir(dir, { recursive: true });

  let meta: UploadMeta;
  try {
    meta = JSON.parse(await readFile(metaPath(input.uploadId), 'utf8')) as UploadMeta;
    if (meta.totalChunks !== input.totalChunks || meta.category !== input.category) {
      throw new Error('Sesi upload tidak cocok');
    }
  } catch {
    meta = {
      category: input.category,
      fileName: input.fileName,
      mime: input.mime,
      totalChunks: input.totalChunks,
      received: [],
    };
    await writeFile(metaPath(input.uploadId), JSON.stringify(meta));
  }

  await writeFile(path.join(dir, String(input.chunkIndex)), input.bytes);
  if (!meta.received.includes(input.chunkIndex)) {
    meta.received.push(input.chunkIndex);
    await writeFile(metaPath(input.uploadId), JSON.stringify(meta));
  }

  if (meta.received.length < input.totalChunks) {
    return { complete: false as const, received: meta.received.length, total: input.totalChunks };
  }

  const cfg = UPLOAD_CATEGORY_DIRS[input.category];
  const mime = input.mime || 'image/jpeg';
  if (!mime.startsWith('image/')) {
    await rm(dir, { recursive: true, force: true });
    throw new Error('Format file harus gambar');
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const finalName = `${cfg.prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const chunks: Buffer[] = [];
  for (let i = 0; i < input.totalChunks; i++) {
    chunks.push(await readFile(path.join(dir, String(i))));
  }
  const assembled = Buffer.concat(chunks);

  await rm(dir, { recursive: true, force: true });

  const url = await storeUploadedFile({
    folder: cfg.dir,
    fileName: finalName,
    bytes: assembled,
    mime,
  });

  return {
    complete: true as const,
    url,
    received: input.totalChunks,
    total: input.totalChunks,
  };
}

/** Bersihkan upload sementara yang tertinggal (>1 jam). */
export async function cleanupStaleUploads() {
  try {
    const entries = await readdir(TMP_ROOT, { withFileTypes: true });
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(TMP_ROOT, entry.name);
      const info = await stat(dir).catch(() => null);
      if (!info || info.mtimeMs < cutoff) {
        await rm(dir, { recursive: true, force: true });
      }
    }
  } catch {
    // tmp belum ada
  }
}
