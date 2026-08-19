import type { UserSettings } from '@/types';

export function normalExamMarkTone(mark: number | null, maxMarks: number, settings: Pick<UserSettings, 'requiredTEPercent' | 'aPlusThreshold'>) {
  return academicResultTone(mark, maxMarks > 0 && mark !== null ? (mark / maxMarks) * 100 : null, settings);
}

export function academicResultTone(mark: number | null, percentage: number | null, settings: Pick<UserSettings, 'requiredTEPercent' | 'aPlusThreshold'>) {
  if (mark === null || percentage === null) return 'neutral';
  if (percentage < settings.requiredTEPercent) return 'failed';
  return mark >= settings.aPlusThreshold ? 'aplus' : 'normal';
}

export function plusOneTEPercentageTone(teMarks: number | null, tePercentage: number | null, settings: Pick<UserSettings, 'requiredTEPercent' | 'aPlusThreshold'>) {
  return academicResultTone(teMarks, tePercentage, settings);
}
