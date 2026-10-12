/**
 * Inline SVG icons (24x24, currentColor). Hand-drawn so they render the same on every
 * platform, unlike emoji, and stay crisp at any size.
 */
const svg = (body: string, fill = false): string =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" ${
    fill
      ? 'fill="currentColor"'
      : 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'
  }>${body}</svg>`;

export const ICONS = {
  play: svg(
    '<path d="M7 4.5v15a1 1 0 0 0 1.5.87l12.5-7.5a1 1 0 0 0 0-1.74L8.5 3.63A1 1 0 0 0 7 4.5z"/>',
    true,
  ),
  palette: svg(
    '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .9-1.8 2-1.8h2.2A3.8 3.8 0 0 0 21 10.7C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7" r="1.2" fill="currentColor"/>',
  ),
  book: svg(
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 12h5"/>',
  ),
  trophy: svg(
    '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a4 4 0 0 1-4 4M7 5H4v2a4 4 0 0 0 4 4"/>',
  ),
  target: svg(
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  ),
  flag: svg('<path d="M5 22V3"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  dna: svg(
    '<path d="M7 3c0 6 10 6 10 12s-10 3-10 6"/><path d="M17 3c0 6-10 6-10 12s10 3 10 6"/><path d="M8.5 7h7M8.5 17h7"/>',
  ),
  globe: svg(
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  ),
  soundOn: svg(
    '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  ),
  soundOff: svg(
    '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  ),
  pencil: svg('<path d="M15.5 4.5l4 4L8 20H4v-4z"/><path d="M13 7l4 4"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  pause: svg(
    '<rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/>',
    true,
  ),
  mouse: svg('<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3"/>'),
  finger: svg(
    '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11l3.8.8a2 2 0 0 1 1.6 2.3l-.8 4.4A3 3 0 0 1 13.6 21H11a3 3 0 0 1-2.4-1.2L5.5 15.6a1.5 1.5 0 0 1 2.1-2.1L9 15"/>',
  ),
  lock: svg(
    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  ),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  bolt: svg('<path d="M13.5 2 4 13.5h7L10 22l10-12.5h-7z"/>', true),
  home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>'),
} as const;

export type IconName = keyof typeof ICONS;
