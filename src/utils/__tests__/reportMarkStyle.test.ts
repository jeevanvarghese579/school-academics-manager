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
  it('uses Required TE percentage only for Plus One TE percentage styling', () => {
    expect(plusOneTEPercentageTone(26.67, 30)).toBe('failed');
    expect(plusOneTEPercentageTone(30, 30)).toBe('normal');
    expect(plusOneTEPercentageTone(null, 30)).toBe('neutral');
  });
});
