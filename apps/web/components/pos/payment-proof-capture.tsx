'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadFileInChunks } from '@/lib/chunked-upload-client';
import type { UploadCategory } from '@/lib/chunked-upload-shared';

interface PaymentProofCaptureProps {
  required: boolean;
  category: UploadCategory;
  proofPreview: string | null;
  proofUrl: string | null;
  onProofChange: (proofUrl: string | null, preview: string | null) => void;
  title?: string;
  hint?: string;
}

export function PaymentProofCapture({
  required,
  category,
  proofPreview,
  proofUrl,
  onProofChange,
  title = 'Bukti Pembayaran',
  hint = 'Foto bukti transfer atau QRIS dari pelanggan',
}: PaymentProofCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      onProofChange(null, null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }

    const preview = URL.createObjectURL(file);
    onProofChange(null, preview);
    setUploading(true);
    setProgress(0);

    try {
      const url = await uploadFileInChunks(file, category, setProgress);
      onProofChange(url, preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal');
      onProofChange(null, null);
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    onProofChange(null, null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const ready = !!proofUrl && !uploading;

  return (
    <div className="rounded-xl border border-dashed border-rainbow-cyan/40 bg-brand-sky/5 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <ImageIcon className="h-4 w-4 text-rainbow-cyan" />
        {title} {required && <span className="text-red-500">*</span>}
      </p>
      <p className="mb-3 text-xs text-brand-navy/55">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />

      {proofPreview ? (
        <div className="relative mx-auto max-w-xs">
          <Image
            src={proofPreview}
            alt="Bukti pembayaran"
            width={280}
            height={360}
            className="rounded-xl border border-brand-navy/10 object-contain"
            unoptimized
          />
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/45 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="mt-2 text-xs font-medium">Upload batch… {progress}%</p>
            </div>
          )}
          {ready && (
            <p className="mt-2 text-center text-xs text-rainbow-green">✓ Bukti siap</p>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={clear}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="h-4 w-4" /> Ambil Foto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={uploading}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.removeAttribute('capture');
                inputRef.current.click();
                inputRef.current.setAttribute('capture', 'environment');
              }
            }}
          >
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
