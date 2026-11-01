import type { WatchState } from "../domain/watch-state";

export type Lab = { l: number; a: number; b: number };

export type OffLegend = { original: string; distance: number };

export type ColorResult = { state: WatchState; offLegend: OffLegend | null };

/** Exact legend of the Excel (hex of the name cell fill, alpha ignored). */
const LEGEND: ReadonlyArray<readonly [string, WatchState]> = [
  ["FF6363", "urgent"],
  ["61D230", "watched"],
  ["B184D2", "watched_no_rewatch"],
  ["FFFF00", "watched_rewatch"],
  ["A4C2F4", "watched_awful"],
];

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function labF(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}

/** sRGB hex (RRGGBB) to CIE Lab, D65 white point. */
export function hexToLab(hex: string): Lab {
  const r = srgbToLinear(parseInt(hex.slice(0, 2), 16));
  const g = srgbToLinear(parseInt(hex.slice(2, 4), 16));
  const b = srgbToLinear(parseInt(hex.slice(4, 6), 16));
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

function hueAngle(b: number, a: number): number {
  if (a === 0 && b === 0) return 0;
  const h = deg(Math.atan2(b, a));
  return h >= 0 ? h : h + 360;
}

/** CIEDE2000 colour difference (Sharma, Wu, Dalal 2005). */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const cBar = (Math.hypot(lab1.a, lab1.b) + Math.hypot(lab2.a, lab2.b)) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const a1 = (1 + g) * lab1.a;
  const a2 = (1 + g) * lab2.a;
  const c1 = Math.hypot(a1, lab1.b);
  const c2 = Math.hypot(a2, lab2.b);
  const h1 = hueAngle(lab1.b, a1);
  const h2 = hueAngle(lab2.b, a2);

  const dL = lab2.l - lab1.l;
  const dC = c2 - c1;
  let dh = 0;
  if (c1 * c2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));

  const lBar = (lab1.l + lab2.l) / 2;
  const cBar2 = (c1 + c2) / 2;
  let hBar = h1 + h2;
  if (c1 * c2 !== 0) {
    if (Math.abs(h1 - h2) <= 180) hBar = (h1 + h2) / 2;
    else hBar = (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(rad(hBar - 30)) +
    0.24 * Math.cos(rad(2 * hBar)) +
    0.32 * Math.cos(rad(3 * hBar + 6)) -
    0.2 * Math.cos(rad(4 * hBar - 63));
  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cBar2 ** 7 / (cBar2 ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cBar2;
  const sh = 1 + 0.015 * cBar2 * t;
  const rt = -Math.sin(rad(2 * dTheta)) * rc;

  return Math.sqrt(
    (dL / sl) ** 2 +
      (dC / sc) ** 2 +
      (dH / sh) ** 2 +
      rt * (dC / sc) * (dH / sh),
  );
}

const LEGEND_LAB = LEGEND.map(([hex, state]) => ({
  state,
  lab: hexToLab(hex),
  hex,
}));

/**
 * Maps the fill argb of the name cell to a domain state. Exact legend colors
 * map directly; no fill is pending; any other color goes to the nearest legend
 * color by CIEDE2000 and is reported through `offLegend`.
 */
export function stateFromFill(argb: string | null): ColorResult {
  if (argb === null) return { state: "pending", offLegend: null };
  const hex = argb.slice(-6).toUpperCase();
  if (argb.length < 6 || !/^[0-9A-F]{6}$/.test(hex)) {
    return { state: "pending", offLegend: null };
  }
  const exact = LEGEND.find(([legendHex]) => legendHex === hex);
  if (exact) return { state: exact[1], offLegend: null };

  const lab = hexToLab(hex);
  let best = LEGEND_LAB[0];
  let bestDistance = Infinity;
  for (const entry of LEGEND_LAB) {
    const distance = deltaE2000(lab, entry.lab);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return {
    state: best.state,
    offLegend: { original: hex, distance: bestDistance },
  };
}
