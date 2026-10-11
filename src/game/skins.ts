/**
 * Cosmetic skins bought with coins. Pure data: the renderer turns a style into pixels,
 * the economy decides who owns what. Ids are persisted, so never rename one.
 */
export type SkinStyle =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string }
  | { kind: 'stripes'; base: string; stripe: string }
  | { kind: 'spots'; base: string; spot: string }
  | { kind: 'stars'; from: string; to: string }
  | { kind: 'outline'; fill: string; glow: string }
  | { kind: 'rainbow' };

export interface Skin {
  id: string;
  name: string;
  price: number;
  /** Representative hue for particles and accents. */
  hue: number;
  /** Body outline and fin colour. */
  edge: string;
  style: SkinStyle;
}

export const SKINS: readonly Skin[] = [
  {
    id: 'classic',
    name: 'Mint',
    price: 0,
    hue: 165,
    edge: '#127a5c',
    style: { kind: 'solid', color: '#43d6a5' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    price: 120,
    hue: 210,
    edge: '#0f2f80',
    style: { kind: 'gradient', from: '#5fd0ff', to: '#1d4fd6' },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    price: 200,
    hue: 15,
    edge: '#8a1f3d',
    style: { kind: 'gradient', from: '#ffc15e', to: '#ff3e7f' },
  },
  {
    id: 'toxic',
    name: 'Toxic',
    price: 300,
    hue: 90,
    edge: '#2e5b07',
    style: { kind: 'spots', base: '#9be22d', spot: '#4f8a10' },
  },
  {
    id: 'candy',
    name: 'Candy',
    price: 450,
    hue: 330,
    edge: '#a3245f',
    style: { kind: 'stripes', base: '#ff8fc7', stripe: '#fff1f8' },
  },
  {
    id: 'lava',
    name: 'Lava',
    price: 650,
    hue: 20,
    edge: '#5c1205',
    style: { kind: 'spots', base: '#ff5a1f', spot: '#ffd34d' },
  },
  {
    id: 'shadow',
    name: 'Shadow',
    price: 900,
    hue: 250,
    edge: '#8a7dff',
    style: { kind: 'outline', fill: '#151a2b', glow: '#8a7dff' },
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 1300,
    hue: 45,
    edge: '#8a6400',
    style: { kind: 'gradient', from: '#fff3b0', to: '#d4a017' },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    price: 1800,
    hue: 265,
    edge: '#6b4cff',
    style: { kind: 'stars', from: '#5a2aa8', to: '#0b1a4a' },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    price: 2600,
    hue: 0,
    edge: '#ffffff',
    style: { kind: 'rainbow' },
  },
];

export const DEFAULT_SKIN_ID = 'classic';

const BY_ID = new Map(SKINS.map((s) => [s.id, s]));

export function getSkin(id: string | null | undefined): Skin | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

export function isSkinId(id: string): boolean {
  return BY_ID.has(id);
}
