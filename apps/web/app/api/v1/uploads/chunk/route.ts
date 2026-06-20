import { NextResponse } from 'next/server';
import { Role } from '@aww/database';
import { auth } from '@/lib/auth';
import { cleanupStaleUploads, storeUploadChunk } from '@/lib/chunked-upload-server';
import type { UploadCategory } from '@/lib/chunked-upload-shared';

const EXPENSE_ROLES = new Set<Role>([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
const PAYMENT_ROLES = new Set<Role>([Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN]);

function canUpload(category: UploadCategory, role: Role) {
  return category === 'expense-proof' ? EXPENSE_ROLES.has(role) : PAYMENT_ROLES.has(role);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const category = String(formData.get('category') ?? '') as UploadCategory;
  if (category !== 'expense-proof' && category !== 'payment-proof') {
    return NextResponse.json({ error: 'Kategori upload tidak valid' }, { status: 400 });
  }

  const role = session.user.role as Role;
  if (!canUpload(category, role)) {
    return NextResponse.json({ error: 'Tidak diizinkan upload file ini' }, { status: 403 });
  }

  const chunk = formData.get('chunk');
  if (!(chunk instanceof Blob) || chunk.size === 0) {
    return NextResponse.json({ error: 'Chunk file tidak ditemukan' }, { status: 400 });
  }

  const uploadId = String(formData.get('uploadId') ?? '');
  const chunkIndex = parseInt(String(formData.get('chunkIndex') ?? ''), 10);
  const totalChunks = parseInt(String(formData.get('totalChunks') ?? ''), 10);

  try {
    void cleanupStaleUploads();
    const bytes = Buffer.from(await chunk.arrayBuffer());
    const result = await storeUploadChunk({
      uploadId,
      chunkIndex,
      totalChunks,
      category,
      fileName: String(formData.get('fileName') ?? 'upload.jpg'),
      mime: String(formData.get('mime') ?? 'image/jpeg'),
      bytes,
    });

    if (result.complete) {
      return NextResponse.json({ complete: true, url: result.url, received: result.received, total: result.total });
    }
    return NextResponse.json({ complete: false, received: result.received, total: result.total });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload gagal';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
