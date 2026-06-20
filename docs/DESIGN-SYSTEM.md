# AWW Laundry — Design System
## Rainbow Bubbles Theme — Logo-Driven

> **Logo:** `assets/brand/aww-laundry-logo.png`  
> **Animasi:** [BRAND-ANIMATION.md](./BRAND-ANIMATION.md)  
> Berlaku untuk: **Web** · **iOS** · **Android**

---

## 1. Filosofi Brand

**FRESH • CLEAN • FUN** — tema visual AWW Laundry terinspirasi langsung dari logo resmi:

| Konsep | Implementasi |
|---|---|
| **Rainbow Fluid** | Gradient 7 warna seperti huruf "AWW" di logo |
| **Gelembung Pelangi** | Semua halaman hidup dengan bubble float, pop, shimmer |
| **Playful Premium** | GSAP + Lottie — gerakan fluid tanpa mengorbankan profesionalisme |
| **Navy Trust** | `#1E3A6E` untuk teks & navigasi — franchise credible |
| **Orange Action** | `#FF8C2A` untuk CTA — energi "DRY" dari logo |

---

## 2. Color Palette (Dari Logo)

### Brand Core

```
#1E3A6E  brand-navy     Heading, header, LAUN text
#FF8C2A  brand-orange   CTA, DRY, tombol aksi
#FF5C9A  brand-pink     FRESH, fun accent
#5BC0EB  brand-sky      Water splash, info, franchise
#FAFAF8  brand-cream    Background utama
```

### Rainbow Spectrum

```
#FF5C9A  pink    #FF8C2A  orange   #FFD23F  yellow
#6BCB77  green   #4ECDC4  cyan     #4A90D9  blue
#9B59B6  purple
```

### Gradient Tokens

| Token | CSS Variable | Penggunaan |
|---|---|---|
| `brandHero` | `--aww-gradient-brand-hero` | Splash, login — cream + rainbow wash |
| `rainbow` | `--aww-gradient-rainbow` | Progress, border aktif, celebration |
| `header` | `--aww-gradient-header` | Navy → blue navigation |
| `cardBubble` | `--aww-gradient-card` | Glass bubble KPI cards |
| `ctaPrimary` | `--aww-gradient-cta` | Orange CTA — Bayar, Submit |
| `paymentSuccess` | `--aww-gradient-payment` | Green→cyan→pink toast |
| `bubbleShimmer` | `--aww-gradient-bubble` | Iridescent bubble surface |

---

## 3. Rainbow Bubble Components

### CSS Utilities

```css
.aww-rainbow-border  /* flowing rainbow border */
.aww-bubble-float    /* vertical float animation */
.aww-bubble-shimmer  /* opacity pulse shimmer */
```

### Tailwind (Web)

```tsx
<div className="min-h-screen bg-aww-brand-hero relative overflow-hidden">
  <RainbowBubbleField />  {/* GSAP particle layer */}
  <Lottie animation="bubble-float-loop" className="absolute inset-0 opacity-30" />
  <div className="rainbow-border-active p-[2px] rounded-aww-xl">
    <div className="bg-white rounded-aww-xl p-8">{/* auth form */}</div>
  </div>
</div>
```

---

## 4–11. [Komponen UI, Typography, Spacing, Mobile, Dark Mode, Accessibility]

> Detail komponen UI, typography, spacing, dan accessibility mengikuti palette di atas.  
> Lihat [BRAND-ANIMATION.md](./BRAND-ANIMATION.md) untuk spesifikasi animasi lengkap.

---

## File Reference

```
assets/brand/aww-laundry-logo.png
packages/design-tokens/{colors,gradients,animations}.ts
docs/BRAND-ANIMATION.md
```

---

## 4. Komponen UI — Color Mapping

### Buttons

| Variant | Background | Text | Shadow |
|---|---|---|---|
| Primary (CTA) | `gradient-cta` (orange) | white | `glow-orange` |
| Rainbow | `gradient-rainbow` | white | `glow-rainbow` |
| Secondary | `brand-sky` @ 12% | `brand-navy` | `sm` |
| Outline | transparent + rainbow border | `brand-navy` | — |
| Ghost | transparent | `rainbow-cyan` | — |
| Danger | `#E53935` solid | white | — |

### Order Status → Rainbow

| Status | Warna | Lottie |
|---|---|---|
| Diterima | cyan `#4ECDC4` | — |
| Mencuci | blue `#4A90D9` | `washing-machine-wink.json` |
| Mengering | purple `#9B59B6` | — |
| Menyetrika | orange `#FF8C2A` | `ironing-sparkle.json` |
| Melipat | yellow `#FFD23F` | `folding-clothes.json` |
| Siap | green `#6BCB77` | — |
| Trouble | red | pulse |

---

## 5–11. Typography, Spacing, Mobile, Dark Mode, Accessibility

| Token | Font | Usage |
|---|---|---|
| `display-xl` | Plus Jakarta Sans 36px/700 | Splash — "AWW LAUNDRY" |
| `heading-md` | Plus Jakarta Sans 20px/600 | Section title |
| `body-lg` | Inter 16px/400 | Body text |
| `tagline` | Inter 12px/600 | "FRESH • CLEAN • FUN" — `brand-pink` |

Dark mode base: `#0F1F3D` · CTA tetap orange · Rainbow accents lebih terang.

Accessibility: navy `#1E3A6E` on cream `#FAFAF8` = AAA. `prefers-reduced-motion` → disable bubble float.

---

*Rainbow Bubbles Design System — derived from `assets/brand/aww-laundry-logo.png`*
