/**
 * Tenant brand-color → contrast-safe OKLCH accent.
 *
 * See docs/design/02-DESIGN-SYSTEM.md §6 and docs/design/04-DESIGN-ROADMAP.md [D3.1].
 *
 * A school picks one brand color in the setup wizard (Phase 3.7.2 branding step).
 * This never gets rendered as-is: it's parsed to OKLCH, checked for AA contrast
 * (4.5:1) against the app's paper ground / dark-mode ground, and — if it fails —
 * has its LIGHTNESS adjusted (never hue, never chroma) until it passes. The caller
 * always gets back a value that's safe to use as --color-tenant-accent, plus a flag
 * so the setup wizard can show "we adjusted this slightly for readability."
 *
 * Deliberately dependency-free (no culori/chroma-js) — the color math needed here
 * (hex -> sRGB -> linear -> OKLab -> OKLCH, relative luminance, contrast ratio) is
 * small and stable; pulling in a color library for this one utility isn't worth the
 * bundle weight in a package that's imported by both the Next.js app and any future
 * script/report tooling.
 */

export interface OklchColor {
  l: number; // lightness, 0-1
  c: number; // chroma, typically 0-0.4
  h: number; // hue, degrees 0-360
}

export interface TenantAccentResult {
  /** CSS-ready oklch() string, safe to assign to --color-tenant-accent */
  css: string;
  oklch: OklchColor;
  /** Contrast ratio actually achieved against the target ground color */
  contrastRatio: number;
  /** True if the input color's lightness had to be adjusted to pass AA */
  wasAdjusted: boolean;
  /** The original input, unmodified, for audit/display ("here's what you picked") */
  input: string;
}

const AA_CONTRAST_MIN = 4.5;

// --- sRGB <-> linear light ---------------------------------------------------

function hexToSrgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => v / 255) as [
    number,
    number,
    number,
  ];
}

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

// --- linear sRGB <-> OKLab (Björn Ottosson's reference matrices) ------------

function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function oklabToOklch(L: number, a: number, b: number): OklchColor {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToOklab(o: OklchColor): [number, number, number] {
  const hRad = (o.h * Math.PI) / 180;
  return [o.l, o.c * Math.cos(hRad), o.c * Math.sin(hRad)];
}

export function hexToOklch(hex: string): OklchColor {
  const [r, g, b] = hexToSrgb(hex).map(srgbToLinear);
  const [L, a, bb] = linearSrgbToOklab(r, g, b);
  return oklabToOklch(L, a, bb);
}

function oklchToRelativeLuminance(o: OklchColor): number {
  const [L, a, b] = oklchToOklab(o);
  const [r, g, bl] = oklabToLinearSrgb(L, a, b).map((v) => Math.min(1, Math.max(0, v)));
  // WCAG relative luminance from LINEAR sRGB components
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

/** WCAG 2.x contrast ratio between two OKLCH colors, via relative luminance. */
export function contrastRatio(a: OklchColor, b: OklchColor): number {
  const la = oklchToRelativeLuminance(a);
  const lb = oklchToRelativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function oklchToCss(o: OklchColor): string {
  return `oklch(${(o.l * 100).toFixed(1)}% ${o.c.toFixed(3)} ${o.h.toFixed(1)})`;
}

/**
 * Adjust ONLY lightness (never hue/chroma — that's the whole point: a school's
 * chosen hue is preserved, only its readability is corrected) until contrast
 * against `ground` reaches `minRatio`. Binary search over lightness in [0, 1].
 */
function adjustLightnessForContrast(
  color: OklchColor,
  ground: OklchColor,
  minRatio: number,
): { color: OklchColor; achieved: number } {
  const groundLum = oklchToRelativeLuminance(ground);
  // Decide direction: if ground is light (paper mode), we need a DARKER accent;
  // if ground is dark (Night Register), we need a LIGHTER accent.
  const groundIsLight = groundLum > 0.5;

  let lo = groundIsLight ? 0 : color.l;
  let hi = groundIsLight ? color.l : 1;
  let best = color;
  let bestRatio = contrastRatio(color, ground);

  if (bestRatio >= minRatio) {
    return { color, achieved: bestRatio };
  }

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate: OklchColor = { ...color, l: mid };
    const ratio = contrastRatio(candidate, ground);

    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }

    if (ratio >= minRatio) {
      // Found a passing value — try to get closer to the ORIGINAL lightness
      // (smallest visible change) by narrowing toward the original side.
      if (groundIsLight) {
        lo = mid;
      } else {
        hi = mid;
      }
    } else if (groundIsLight) {
      hi = mid;
    } else {
      lo = mid;
    }

    if (Math.abs(hi - lo) < 0.002) break;
  }

  return { color: best, achieved: bestRatio };
}

/**
 * Main entry point. Pass the school's chosen hex color and the ground color it
 * will sit against (paper ground by default; pass the dark-mode ground when
 * pre-computing the dark-mode variant).
 */
export function resolveTenantAccent(
  inputHex: string,
  ground: OklchColor = { l: 0.975, c: 0.012, h: 80 }, // --background in :root
  minRatio: number = AA_CONTRAST_MIN,
): TenantAccentResult {
  const input = hexToOklch(inputHex);
  const { color, achieved } = adjustLightnessForContrast(input, ground, minRatio);

  return {
    css: oklchToCss(color),
    oklch: color,
    contrastRatio: achieved,
    wasAdjusted: Math.abs(color.l - input.l) > 0.005,
    input: inputHex,
  };
}

/** Ground presets matching globals.css --background in each mode. */
export const GROUND_LIGHT: OklchColor = { l: 0.975, c: 0.012, h: 80 };
export const GROUND_DARK: OklchColor = { l: 0.18, c: 0.012, h: 55 };
