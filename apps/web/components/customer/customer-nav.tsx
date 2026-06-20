'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#layanan', label: 'Layanan' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#harga', label: 'Harga' },
  { href: '#testimoni', label: 'Testimoni' },
];

export function CustomerNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/80 shadow-aww-sm backdrop-blur-xl' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
        <Link href="/welcome" className="flex items-center gap-2">
          <Image src="/brand/logo.png" alt="AWW Laundry" width={120} height={60} className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-brand-navy/70 transition-colors hover:text-brand-navy">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/track">
            <Button variant="outline" size="sm">Lacak Cucian</Button>
          </Link>
          <Link href="/book">
            <Button variant="primary" size="sm">Pesan Jemput</Button>
          </Link>
        </div>

        <button className="md:hidden text-brand-navy" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-brand-navy/10 bg-white/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-brand-navy/70">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-3">
              <Link href="/track" className="flex-1"><Button variant="outline" size="sm" className="w-full">Lacak</Button></Link>
              <Link href="/book" className="flex-1"><Button variant="primary" size="sm" className="w-full">Pesan Jemput</Button></Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
