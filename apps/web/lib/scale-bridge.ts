/**
 * Digital scale bridge — Web Serial API (USB/RS232) + stable weight parsing.
 * Compatible with most laundry scales that output ASCII weight lines.
 */

export type ScaleConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ScaleReading {
  weightKg: number;
  stable: boolean;
  raw: string;
  timestamp: number;
}

/** Parse weight from common scale output formats. */
export function parseWeightFromLine(raw: string): number | null {
  const line = raw.trim();
  if (!line || /OL|ERR|----|UNDER/i.test(line)) return null;

  // ST,GS,+  3.450kg  (Mettler/CAS style)
  const gsMatch = line.match(/GS[,+]?\s*([+-]?\d+\.?\d*)/i);
  if (gsMatch) {
    const val = parseFloat(gsMatch[1]);
    return val > 0 && val < 500 ? val : null;
  }

  // WGT:3.45 or Weight: 3.45
  const labelMatch = line.match(/(?:WGT|WEIGHT|BERAT)[:\s]+([+-]?\d+\.?\d*)/i);
  if (labelMatch) {
    const val = parseFloat(labelMatch[1]);
    return val > 0 && val < 500 ? val : null;
  }

  // Generic: "  3.450 kg" or "3.45"
  const numMatch = line.match(/([+-]?\d+\.\d{1,3}|\d+)/);
  if (!numMatch) return null;

  let val = parseFloat(numMatch[1]);
  if (/g\b/i.test(line) && !/kg/i.test(line)) val /= 1000;
  if (val <= 0 || val >= 500) return null;
  return Math.round(val * 1000) / 1000;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

type ScaleListener = (reading: ScaleReading | null, state: ScaleConnectionState) => void;

class ScaleBridge {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private listeners = new Set<ScaleListener>();
  private state: ScaleConnectionState = 'disconnected';
  private buffer = '';
  private lastWeight: number | null = null;
  private stableCount = 0;
  private abortCtrl: AbortController | null = null;

  subscribe(fn: ScaleListener) {
    this.listeners.add(fn);
    fn(this.lastWeight != null ? this.makeReading(this.lastWeight, true, '') : null, this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(reading: ScaleReading | null, state?: ScaleConnectionState) {
    if (state) this.state = state;
    for (const fn of this.listeners) fn(reading, this.state);
  }

  private makeReading(weightKg: number, stable: boolean, raw: string): ScaleReading {
    return { weightKg, stable, raw, timestamp: Date.now() };
  }

  private processLine(line: string) {
    const weight = parseWeightFromLine(line);
    if (weight == null) return;

    if (this.lastWeight != null && Math.abs(weight - this.lastWeight) < 0.005) {
      this.stableCount++;
    } else {
      this.stableCount = 1;
      this.lastWeight = weight;
    }

    const stable = this.stableCount >= 2;
    this.emit(this.makeReading(weight, stable, line));
  }

  async connect(existingPort?: SerialPort) {
    if (!isWebSerialSupported()) {
      this.emit(null, 'error');
      throw new Error('Browser tidak mendukung Web Serial API. Gunakan Chrome/Edge di desktop.');
    }

    this.emit(null, 'connecting');
    try {
      this.port = existingPort ?? (await navigator.serial!.requestPort());
      await this.port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
      this.abortCtrl = new AbortController();
      this.buffer = '';
      this.lastWeight = null;
      this.stableCount = 0;
      this.emit(null, 'connected');
      void this.readLoop();
    } catch (err) {
      this.emit(null, 'error');
      throw err;
    }
  }

  private async readLoop() {
    if (!this.port?.readable) return;
    const decoder = new TextDecoder();
    this.reader = this.port.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += decoder.decode(value, { stream: true });
        const lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) this.processLine(line);
        }
      }
    } catch {
      if (this.state === 'connected') this.emit(null, 'error');
    } finally {
      this.reader?.releaseLock();
      this.reader = null;
    }
  }

  async disconnect() {
    this.abortCtrl?.abort();
    try {
      await this.reader?.cancel();
    } catch {
      /* ignore */
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {
        /* ignore */
      }
    }
    this.port = null;
    this.reader = null;
    this.lastWeight = null;
    this.stableCount = 0;
    this.emit(null, 'disconnected');
  }
}

export const scaleBridge = new ScaleBridge();
