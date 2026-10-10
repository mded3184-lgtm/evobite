import type { Progress } from '@/game/economy';
import { mergeProgress } from '@/game/economy';
import type { PlatformSdk } from './types';

const KEY = 'evobite.progress.v1';

export function loadProgress(sdk: PlatformSdk): Progress {
  const raw = sdk.getItem(KEY);
  if (!raw) return mergeProgress(null);
  try {
    return mergeProgress(JSON.parse(raw));
  } catch {
    return mergeProgress(null);
  }
}

export function saveProgress(sdk: PlatformSdk, progress: Progress): void {
  sdk.setItem(KEY, JSON.stringify(progress));
}
