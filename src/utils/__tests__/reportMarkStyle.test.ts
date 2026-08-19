import { describe, expect, it } from 'vitest';
import { normalExamMarkTone, plusOneTEPercentageTone } from '@/utils/reportMarkStyle';

const settings = { requiredTEPercent: 30, aPlusThreshold: 90 };
describe('class report mark styling', () => {
  it('uses the configured pass percentage and A+ mark threshold', () => {
    expect(normalExamMarkTone(8, 30, settings)).toBe('failed');
    expect(normalExamMarkTone(15, 30, settings)).toBe('normal');
    expect(normalExamMarkTone(90, 100, settings)).toBe('aplus');
    expect(normalExamMarkTone(null, 30, settings)).toBe('neutral');
  });
  it('uses Required TE percentage for Plus One failure and TE marks for A+', () => {
    expect(plusOneTEPercentageTone(12, 12 / 60 * 100, { requiredTEPercent: 30, aPlusThreshold: 54 })).toBe('failed');
    expect(plusOneTEPercentageTone(32, 32 / 60 * 100, { requiredTEPercent: 30, aPlusThreshold: 54 })).toBe('normal');
    expect(plusOneTEPercentageTone(54, 90, { requiredTEPercent: 30, aPlusThreshold: 54 })).toBe('aplus');
    expect(plusOneTEPercentageTone(null, null, { requiredTEPercent: 30, aPlusThreshold: 54 })).toBe('neutral');
  });
});
