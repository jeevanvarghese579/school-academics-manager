import type { UserSettings } from '@/types';

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${roundTo(value, decimals).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return roundTo(value, decimals).toFixed(decimals);
}

// Percentage for a single exam
export function calcPercentage(obtained: number | null, maxMarks: number): number | null {
  if (obtained === null || maxMarks <= 0) return null;
  return (obtained / maxMarks) * 100;
}

// Combined percentage across multiple exams - weighted by max marks
export function calcCombinedPercentage(
  entries: { obtained: number | null; maxMarks: number }[],
): { combinedObtained: number; combinedMax: number; combinedPercentage: number | null } {
  const validEntries = entries.filter((e) => e.obtained !== null && e.maxMarks > 0);
  const combinedObtained = validEntries.reduce((sum, e) => sum + (e.obtained as number), 0);
  const combinedMax = validEntries.reduce((sum, e) => sum + e.maxMarks, 0);
  if (combinedMax <= 0) return { combinedObtained: 0, combinedMax: 0, combinedPercentage: null };
  return {
    combinedObtained,
    combinedMax,
    combinedPercentage: (combinedObtained / combinedMax) * 100,
  };
}

export interface PlusOneResult {
  teMarks: number | null;
  ceMarks: number | null;
  total: number | null;
  percentage: number | null;
  tePercentage: number | null;
  passed: boolean;
  doublePass: boolean;
  marksRequiredForDoublePass: number | null;
  marksRequiredForAPlus: number | null;
  aPlusAchieved: boolean;
  doubleAPlusAchieved: boolean;
  marksRequiredForDoubleAPlus: number | null;
  isImpossible: boolean;
  isIncomplete: boolean;
}

export function calcPlusOneResult(
  teMarks: number | null,
  ceMarks: number | null,
  settings: Pick<
    UserSettings,
    'plusOneMaxTE' | 'plusOneMaxCE' | 'plusOneMaxTotal' | 'requiredTEPercent' | 'requiredTotalPercent' | 'doublePassEnabled' | 'aPlusThreshold' | 'doubleAPlusThreshold'
  > & Partial<Pick<UserSettings, 'doublePassRequiredPercent'>>,
): PlusOneResult {
  const maxTE = settings.plusOneMaxTE;
  const maxCE = settings.plusOneMaxCE;
  const maxTotal = settings.plusOneMaxTotal || maxTE + maxCE;
  const requiredTE = (settings.requiredTEPercent / 100) * maxTE;
  const requiredTotal = (settings.requiredTotalPercent / 100) * maxTotal;
  // Stored legacy field name is retained for existing user settings; its value is now TE marks, not a percentage.
  const requiredDoublePassTE = settings.doublePassRequiredPercent ?? settings.requiredTEPercent;
  const aPlusThreshold = settings.aPlusThreshold;
  const doubleAPlusThreshold = settings.doubleAPlusThreshold;

  const isIncomplete = teMarks === null || ceMarks === null;
  const te = teMarks ?? 0;
  const ce = ceMarks ?? 0;
  const total = isIncomplete ? 0 : te + ce;
  const percentage = isIncomplete || maxTotal <= 0 ? null : (total / maxTotal) * 100;
  const tePercentage = teMarks === null || maxTE <= 0 ? null : (teMarks / maxTE) * 100;

  const passed = !isIncomplete && te >= requiredTE && total >= requiredTotal;
  const doublePass = settings.doublePassEnabled && !isIncomplete && te >= requiredDoublePassTE;

  // Marks required for double pass
  let marksRequiredForDoublePass: number | null = null;
  let isImpossible = false;

  if (!isIncomplete) {
    if (doublePass) {
      marksRequiredForDoublePass = 0;
    } else {
      const required = Math.max(0, requiredDoublePassTE - te);
      isImpossible = required > maxTE - te;
      marksRequiredForDoublePass = required;
    }
  }

  // Marks required for A+
  let marksRequiredForAPlus: number | null = null;
  if (!isIncomplete && percentage !== null) {
    if (total >= aPlusThreshold) {
      marksRequiredForAPlus = 0;
    } else {
      const deficit = aPlusThreshold - total;
      if (deficit > maxTotal - total && maxTotal - total >= 0) {
        // impossible
        marksRequiredForAPlus = deficit;
      } else {
        marksRequiredForAPlus = Math.max(0, deficit);
      }
    }
  }

  const aPlusAchieved = !isIncomplete && total >= aPlusThreshold;
  // Double A+ is a TE-only target; CE remains part of normal Plus One totals only.
  const doubleAPlusAchieved = teMarks !== null && te >= doubleAPlusThreshold;
  const marksRequiredForDoubleAPlus = teMarks === null ? null : Math.max(0, doubleAPlusThreshold - te);

  return {
    teMarks,
    ceMarks,
    total: isIncomplete ? null : total,
    percentage,
    tePercentage,
    passed,
    doublePass,
    marksRequiredForDoublePass,
    marksRequiredForAPlus,
    aPlusAchieved,
    doubleAPlusAchieved,
    marksRequiredForDoubleAPlus,
    isImpossible,
    isIncomplete,
  };
}

// Class report statistics
export interface ClassStats {
  average: number | null;
  highest: number | null;
  lowest: number | null;
  passCount: number;
  failCount: number;
  doublePassCount: number;
  aPlusCount: number;
  totalStudents: number;
}

export function calcClassStats(percentages: (number | null)[], passResults: boolean[], doublePassResults: boolean[], aPlusResults: boolean[]): ClassStats {
  const valid = percentages.filter((p): p is number => p !== null);
  return {
    average: valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null,
    highest: valid.length > 0 ? Math.max(...valid) : null,
    lowest: valid.length > 0 ? Math.min(...valid) : null,
    passCount: passResults.filter(Boolean).length,
    failCount: passResults.filter((p) => !p).length,
    doublePassCount: doublePassResults.filter(Boolean).length,
    aPlusCount: aPlusResults.filter(Boolean).length,
    totalStudents: percentages.length,
  };
}
