/** Tiny DOM helpers so UI modules stay readable without a framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters -- T lets callers narrow the element type */
export function must<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element ${selector}`);
  return node;
}
/* eslint-enable @typescript-eslint/no-unnecessary-type-parameters */

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m)}:${s < 10 ? '0' : ''}${String(s)}`;
}
