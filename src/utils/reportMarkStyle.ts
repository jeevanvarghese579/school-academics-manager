import type { UserSettings } from '@/types';

export function normalExamMarkTone(mark: number | null, maxMarks: number, settings: Pick<UserSettings, 'requiredTEPercent' | 'aPlusThreshold'>) {
  if (mark === null) return 'neutral';
  if (mark >= settings.aPlusThreshold) return 'aplus';
  return maxMarks > 0 && (mark / maxMarks) * 100 < settings.requiredTEPercent ? 'failed' : 'normal';
}

export function plusOneTEPercentageTone(tePercentage: number | null, requiredTEPercent: number) {
  if (tePercentage === null) return 'neutral';
  return tePercentage < requiredTEPercent ? 'failed' : 'normal';
}
