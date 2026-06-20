import '@/lib/load-root-env';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin, getSupabaseStorageBucket } from './supabase';
import { isSupabaseStorageConfigured } from './env';

export async function storeUploadedFile(input: {
  folder: string;
  fileName: string;
  bytes: Buffer;
  mime: string;
}): Promise<string> {
  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    const bucket = getSupabaseStorageBucket();
    const storagePath = `${input.folder}/${input.fileName}`;

    const { error } = await supabase.storage.from(bucket).upload(storagePath, input.bytes, {
      contentType: input.mime,
      upsert: false,
    });
    if (error) throw new Error(`Upload Supabase gagal: ${error.message}`);

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const outDir = path.join(process.cwd(), 'public', 'uploads', input.folder);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, input.fileName), input.bytes);
  return `/uploads/${input.folder}/${input.fileName}`;
}

/** Cek bucket bisa diakses (list atau head). */
export async function verifySupabaseStorage(): Promise<{ ok: boolean; note?: string }> {
  if (!isSupabaseStorageConfigured()) {
    return { ok: false, note: 'env tidak lengkap' };
  }
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getSupabaseStorageBucket();
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
    if (error) return { ok: false, note: error.message };
    return { ok: true, note: `${bucket} (${data?.length ?? 0} items di root)` };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : 'storage error' };
  }
}
