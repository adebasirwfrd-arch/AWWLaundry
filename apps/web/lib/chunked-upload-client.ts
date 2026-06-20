'use client';

import { UPLOAD_CHUNK_SIZE, type UploadCategory } from './chunked-upload-shared';

function newUploadId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadFileInChunks(
  file: File,
  category: UploadCategory,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!file.size) throw new Error('File kosong');
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar');

  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));
  const uploadId = newUploadId();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * UPLOAD_CHUNK_SIZE;
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);

    const fd = new FormData();
    fd.append('uploadId', uploadId);
    fd.append('chunkIndex', String(i));
    fd.append('totalChunks', String(totalChunks));
    fd.append('category', category);
    fd.append('fileName', file.name);
    fd.append('mime', file.type || 'image/jpeg');
    fd.append('chunk', blob, `${file.name}.part${i}`);

    const res = await fetch('/api/v1/uploads/chunk', { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      complete?: boolean;
      url?: string;
    };

    if (!res.ok) {
      throw new Error(data.error ?? `Upload gagal (batch ${i + 1}/${totalChunks})`);
    }

    onProgress?.(Math.round(((i + 1) / totalChunks) * 100));

    if (data.complete && data.url) {
      return data.url;
    }
  }

  throw new Error('Upload tidak lengkap — coba lagi');
}
