'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, ImageIcon, X, ScanLine, Loader2, Barcode } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseOrderFromQr } from '@/lib/parse-order-qr';
import { Button } from '@/components/ui/button';

const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
];

type Mode = 'choose' | 'camera' | 'processing';

interface OrderBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (orderNumber: string) => void;
  onScanFailed: () => void;
}

export function OrderBarcodeScanner({
  open,
  onClose,
  onScan,
  onScanFailed,
}: OrderBarcodeScannerProps) {
  const uid = useId().replace(/:/g, '');
  const readerId = `order-scan-${uid}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handledRef = useRef(false);

  const [mode, setMode] = useState<Mode>('choose');
  const [cameraError, setCameraError] = useState('');

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* ignore stop races */
    }
    scannerRef.current = null;
  }, []);

  const handleDecoded = useCallback(
    (raw: string) => {
      if (handledRef.current) return;
      const code = parseOrderFromQr(raw);
      if (!code) {
        onScanFailed();
        return;
      }
      handledRef.current = true;
      void stopCamera();
      onScan(code);
    },
    [onScan, onScanFailed, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setMode('camera');
    handledRef.current = false;

    await stopCamera();
    await new Promise((r) => setTimeout(r, 120));

    const el = document.getElementById(readerId);
    if (!el) {
      setCameraError('Kamera tidak siap. Coba lagi.');
      setMode('choose');
      return;
    }

    try {
      const scanner = new Html5Qrcode(readerId, { formatsToSupport: SCAN_FORMATS, verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.min(viewfinderWidth * 0.85, 320),
            height: Math.min(viewfinderHeight * 0.35, 140),
          }),
        },
        (text) => handleDecoded(text),
        () => {
          /* frame miss */
        }
      );
    } catch {
      setCameraError('Tidak bisa membuka kamera. Gunakan "Pilih Foto" atau izinkan akses kamera.');
      setMode('choose');
      await stopCamera();
    }
  }, [readerId, handleDecoded, stopCamera]);

  async function handleFile(file: File) {
    setMode('processing');
    handledRef.current = false;
    await stopCamera();

    const tempId = `order-scan-file-${uid}`;
    let container = document.getElementById(tempId);
    if (!container) {
      container = document.createElement('div');
      container.id = tempId;
      container.className = 'hidden';
      document.body.appendChild(container);
    }

    try {
      const scanner = new Html5Qrcode(tempId, { formatsToSupport: SCAN_FORMATS, verbose: false });
      const text = await scanner.scanFile(file, false);
      scanner.clear();
      handleDecoded(text);
    } catch {
      onScanFailed();
      setMode('choose');
    } finally {
      container.remove();
    }
  }

  function close() {
    void stopCamera();
    setMode('choose');
    setCameraError('');
    handledRef.current = false;
    onClose();
  }

  useEffect(() => {
    if (!open) {
      void stopCamera();
      setMode('choose');
      setCameraError('');
      handledRef.current = false;
    }
  }, [open, stopCamera]);

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-aww-lg">
        <div className="flex items-center justify-between border-b border-brand-navy/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-rainbow-cyan" />
            <p className="font-display font-bold text-brand-navy">Scan Barcode / QR</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-navy/50 hover:bg-brand-navy/5"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-center text-sm text-brand-navy/60">
                Scan barcode atau QR di struk transaksi untuk membuka detail pesanan
              </p>
              {cameraError && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">{cameraError}</p>
              )}
              <Button variant="rainbow" className="w-full" onClick={() => void startCamera()}>
                <Camera className="h-4 w-4" /> Buka Kamera
              </Button>
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="h-4 w-4" /> Pilih Foto Barcode
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {mode === 'camera' && (
            <div>
              <div className="mb-2 flex items-center justify-center gap-2 text-xs text-brand-navy/50">
                <Barcode className="h-3.5 w-3.5" />
                Arahkan barcode struk ke dalam kotak
              </div>
              <div id={readerId} className="overflow-hidden rounded-2xl [&_video]:rounded-2xl" />
              <Button variant="outline" className="mt-3 w-full" onClick={() => { void stopCamera(); setMode('choose'); }}>
                Batal
              </Button>
            </div>
          )}

          {mode === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-10 text-brand-navy/60">
              <Loader2 className="h-10 w-10 animate-spin text-rainbow-cyan" />
              <p className="text-sm">Membaca barcode...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
