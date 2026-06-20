# AWW Laundry — Brand & Animation Guide
## Logo · Rainbow Bubbles · GSAP · Lottie

> **Official Logo:** `assets/brand/aww-laundry-logo.png`  
> **Tagline:** FRESH • CLEAN • FUN  
> **Theme:** Semua UI bergerak seperti **gelembung pelangi** — playful, fluid, premium

---

## 1. Logo Resmi

### File Asset

| File | Path | Usage |
|---|---|---|
| Logo master (PNG) | `assets/brand/aww-laundry-logo.png` | Source of truth warna & karakter |
| Logo web | `public/brand/logo.png` | Header, login, favicon source |
| Logo icon | `public/brand/icon-512.png` | PWA, app icon, splash |
| Lottie animated | `public/lottie/logo-reveal.json` | Splash screen animasi |

### Elemen Logo → UI Mapping

| Elemen Logo | Warna | Penggunaan UI |
|---|---|---|
| Huruf "AWW" fluid rainbow | Pink→Orange→Yellow→Green→Cyan→Blue→Purple | Progress bar, border aktif, highlight |
| Outline navy | `#1E3A6E` | Text heading, header, navigation |
| "DRY" orange | `#FF8C2A` | Primary CTA — Bayar, Submit, Konfirmasi |
| "FRESH" pink | `#FF5C9A` | Tagline, badge, sparkle accent |
| Water splash sky | `#5BC0EB` | Icon air, link, info state |
| Background cream | `#FAFAF8` | App background |
| Gelembung transparan | iridescent white/rainbow | Particle background semua halaman |
| Maskot tetesan air | karakter | Loading, empty state, helper |
| Mesin cuci (huruf W) | winking face | Status "sedang cuci" |
| Pelangi atas logo | full spectrum | Splash header, celebration |

### Logo Usage Rules

- Minimum clear space: setara tinggi huruf "A"
- Jangan distretch, rotate, atau ubah warna logo statis
- Di background gelap: gunakan versi dengan outline putih (future asset)
- Animasi Lottie boleh menambah gelembung & gerakan — tidak mengubah proporsi

---

## 2. Color Palette (Dari Logo)

### Brand Core

```
#1E3A6E  brand-navy     ████  Heading, header, LAUN
#FF8C2A  brand-orange   ████  CTA, DRY, aksi utama
#FF5C9A  brand-pink     ████  FRESH, fun accent
#5BC0EB  brand-sky      ████  Water, franchise, info
#FAFAF8  brand-cream    ████  Background utama
```

### Rainbow Spectrum (Gelembung & Fluid)

```
#FF5C9A  rainbow-pink     ████
#FF8C2A  rainbow-orange   ████
#FFD23F  rainbow-yellow   ████
#6BCB77  rainbow-green    ████
#4ECDC4  rainbow-cyan     ████
#4A90D9  rainbow-blue     ████
#9B59B6  rainbow-purple   ████
```

### Order Status → Warna Pelangi

| Status | Warna | Lottie |
|---|---|---|
| Diterima | cyan | — |
| Mencuci | blue | `washing-machine-wink.json` |
| Mengering | purple | — |
| Menyetrika | orange | `ironing-sparkle.json` |
| Melipat | yellow | `folding-clothes.json` |
| Siap | green | `payment-rainbow-burst.json` (mini) |
| Trouble | red | pulse alert |

---

## 3. Rainbow Bubble Animation System

### Filosofi Gerak

> **"Semua bergerak bagaikan gelembung pelangi"** — tidak ada elemen statis di auth & dashboard. Setiap interaksi memicu micro-animation gelembung: float, pop, shimmer, atau rainbow flow.

### 3 Layer Animasi Background

```
Layer 3 (back)   — Large bubbles (48-120px) slow float, iridescent
Layer 2 (mid)    — Medium bubbles (20-48px) stagger drift
Layer 1 (front)  — Small sparkle bubbles (8-20px) fast pop & fade
Overlay          — Subtle rainbow gradient wash (brandHero)
```

### GSAP — Rainbow Bubble Particle System

```typescript
import gsap from 'gsap';
import { rainbowBubblePresets, pageLoadSequence } from '@aww/design-tokens';

function initRainbowBubbles(container: HTMLElement) {
  const presets = rainbowBubblePresets;
  
  presets.forEach((preset, layerIndex) => {
    const count = layerIndex === 0 ? 6 : layerIndex === 1 ? 12 : 20;
    
    for (let i = 0; i < count; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'aww-bubble';
      const size = gsap.utils.random(preset.size.min, preset.size.max);
      const color = preset.colors[Math.floor(Math.random() * preset.colors.length)];
      
      Object.assign(bubble.style, {
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${color})`,
        boxShadow: 'var(--aww-shadow-glow-bubble)',
        left: `${gsap.utils.random(0, 100)}%`,
        top: `${gsap.utils.random(0, 100)}%`,
        pointerEvents: 'none',
      });

      container.appendChild(bubble);

      // Float — naik turun seperti gelembung sabun
      gsap.to(bubble, {
        y: `random(-${preset.float.yRange}, ${preset.float.yRange})`,
        x: `random(-${preset.float.xRange}, ${preset.float.xRange})`,
        duration: gsap.utils.random(preset.float.duration * 0.8, preset.float.duration * 1.2),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: gsap.utils.random(0, 2),
      });

      // Shimmer — kilau pelangi di permukaan
      if (preset.shimmer) {
        gsap.to(bubble, {
          opacity: gsap.utils.random(preset.opacity.min, preset.opacity.max),
          scale: gsap.utils.random(0.9, 1.1),
          duration: gsap.utils.random(2, 3.5),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }
  });
}
```

### GSAP — Page Load Sequence (Semua Halaman Auth)

```typescript
// 1. Logo Lottie mulai + bubbles spawn
// 2. Stagger bubble pop-in (scale 0 → 1, back.out)
// 3. Content slide-up fade
// 4. Rainbow border mulai flow infinite

const tl = gsap.timeline();
tl.from('.logo-lottie', pageLoadSequence.logo.from)
  .to('.logo-lottie', pageLoadSequence.logo.to)
  .from('.aww-bubble', { ...pageLoadSequence.bubbles.from, stagger: pageLoadSequence.bubbles.stagger })
  .to('.aww-bubble', pageLoadSequence.bubbles.to, '<')
  .from('.auth-card > *', { ...pageLoadSequence.content.from, stagger: pageLoadSequence.content.stagger }, pageLoadSequence.content.delay);
```

### GSAP — Interaksi Micro-animations

| Trigger | Animasi | Easing |
|---|---|---|
| Button hover | Scale 1.05 + glow rainbow shadow | `back.out(1.5)` |
| Button click | Scale 0.95 → pop 1.1 → 1 + bubble burst | `elastic.out(1, 0.4)` |
| Input focus | Rainbow border flow + bubble kecil muncul | `power2.out` |
| Tab switch | Crossfade + bubble float across | `power2.inOut` |
| Payment masuk | Toast slide + rainbow burst + bubble pop | `back.out(2)` |
| Order status change | Progress bar rainbow flow + bubble trail | `none` (linear) |
| Card hover | Lift y:-4 + bubble shimmer behind | `sine.out` |
| Modal open | Scale 0.9→1 + backdrop bubble blur | `back.out(1.7)` |
| Sign out confirm | Bubbles fade out slowly | `power2.in` |

### Rainbow Border Flow (CSS + GSAP)

```css
.rainbow-border-active {
  background: var(--aww-gradient-rainbow);
  background-size: 200% 200%;
  animation: aww-rainbow-shift 6s ease infinite;
  padding: 2px;
  border-radius: var(--aww-radius-lg);
}
```

---

## 4. Lottie Asset Registry

| ID | File | Sumber Logo | Loop | Penggunaan |
|---|---|---|:---:|---|
| `logoReveal` | `logo-reveal.json` | Full logo | ❌ | Splash screen 1.5s |
| `bubbleFloat` | `bubble-float-loop.json` | Gelembung di logo | ✅ | Background login/register |
| `waterDropletMascot` | `water-droplet-mascot.json` | Tetesan air kiri | ✅ | Loading, onboarding |
| `washingMachineWink` | `washing-machine-wink.json` | Mesin cuci huruf W | ✅ | Status mencuci |
| `rainbowArc` | `rainbow-arc.json` | Pelangi atas logo | ✅ | Auth header decoration |
| `washing` | `washing-bubbles.json` | Gelembung sabun | ✅ | Order status cuci |
| `ironing` | `ironing-sparkle.json` | Sparkle bintang | ✅ | Order status setrika |
| `folding` | `folding-clothes.json` | — | ✅ | Order status lipat |
| `paymentSuccess` | `payment-rainbow-burst.json` | Celebration | ❌ | Pembayaran masuk 🔊 |
| `loading` | `bubble-spinner.json` | Gelembung berputar | ✅ | Global loader |
| `emptyState` | `floating-bubbles-empty.json` | Gelembung | ✅ | Tidak ada data |

### Lottie Production Pipeline

```
1. Export karakter dari logo PNG → Adobe After Effects / LottieFiles
2. Warna HARUS match palette.rainbow & palette.brand
3. Gelembung: radial gradient putih→warna rainbow, opacity 0.3-0.6
4. Export JSON optimized < 100KB per file
5. Test di web (lottie-react) + mobile (lottie-react-native)
```

---

## 5. Screen-by-Screen Animation Spec

### Splash Screen
- Fullscreen `brandHero` gradient
- `logo-reveal.json` center (1.5s)
- 20+ rainbow bubbles floating (GSAP particle system)
- `rainbow-arc.json` subtle pulse di atas logo
- Auto redirect setelah 2.5s → login atau dashboard

### Login / Register
- Left panel: logo PNG + `bubble-float-loop.json` + GSAP bubbles
- Right panel: glass card (`cardBubble` gradient) dengan rainbow border on focus
- Google button hover: bubble pop micro-animation
- Tab Masuk/Daftar: crossfade + bubble drift

### Dashboard
- Header: `gradient-header` navy→blue
- KPI cards: `cardBubble` + hover lift + counter roll-up GSAP
- Background: 8 large bubbles slow float (subtle, opacity rendah)
- Chart draw-in dengan warna rainbow spectrum

### POS Kasir
- Weight input focus: bubble shimmer
- Print struk: `payment-rainbow-burst.json` mini saat sukses
- Payment toast: full rainbow burst animation

### Customer Tracking
- Progress stepper: rainbow gradient flow antar status
- Setiap status change: Lottie sesuai fase + bubble celebration

---

## 6. Performance Rules

| Rule | Detail |
|---|---|
| Max bubbles on screen | 40 (mobile: 20) |
| Lottie concurrent | Max 3 animasi aktif |
| `will-change` | Hanya saat animasi, hapus setelah selesai |
| `prefers-reduced-motion` | Disable bubble float, keep fade only |
| Lazy load Lottie | Below fold & non-critical |
| GSAP context cleanup | `gsap.context()` + `revert()` on unmount |
| Bubble DOM | Reuse pool, jangan create/destroy tiap frame |

---

## 7. File Reference

```
assets/brand/
  aww-laundry-logo.png          ← Master logo

packages/design-tokens/
  colors.ts                     ← Brand + rainbow palette
  gradients.ts                  ← Rainbow & bubble gradients
  animations.ts                 ← GSAP presets + Lottie registry
  css-variables.css             ← CSS vars + keyframe animations

public/
  brand/logo.png
  lottie/
    logo-reveal.json
    bubble-float-loop.json
    water-droplet-mascot.json
    washing-machine-wink.json
    rainbow-arc.json
    ...
```

---

*Theme Rainbow Bubbles — derived from official AWW Laundry logo. FRESH • CLEAN • FUN*
