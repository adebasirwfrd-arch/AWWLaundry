'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
  background?: string;
}

/**
 * Renders a CODE128 barcode into an inline SVG (works on screen & print).
 */
export function Barcode({
  value,
  height = 56,
  width = 1.6,
  fontSize = 13,
  displayValue = true,
  className,
  background = 'transparent',
}: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        height,
        width,
        fontSize,
        displayValue,
        margin: 0,
        background,
        lineColor: '#000000',
        font: 'monospace',
      });
    } catch {
      /* invalid value — ignore */
    }
  }, [value, height, width, fontSize, displayValue, background]);

  return <svg ref={ref} className={className} />;
}
