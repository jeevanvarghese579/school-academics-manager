import { describe, expect, it } from "vitest";
import { academicResultSortValue, formatAcademicResult, percentageResultTone } from "@/utils/reportResultPresentation";

describe("class report academic result presentation", () => {
  it("changes Plus One TE, normal exams, and combined analysis between marks and percentages", () => {
    expect(formatAcademicResult("marks", 27, 45, 2)).toBe("27");
    expect(formatAcademicResult("percentage", 27, 45, 2)).toBe("45.00%");
    expect(formatAcademicResult("marks", 9, 60, 2)).toBe("9");
    expect(formatAcademicResult("percentage", 9, 60, 2)).toBe("60.00%");
    expect(formatAcademicResult("marks", 38, 63.333, 2)).toBe("38");
    expect(formatAcademicResult("percentage", 38, 63.333, 2)).toBe("63.33%");
  });

  it("keeps Plus One, normal, and combined failures percentage-based in both views", () => {
    expect(percentageResultTone(20, 30)).toBe("failed");
    expect(percentageResultTone(30, 30)).toBe("normal");
    expect(percentageResultTone(25, 30)).toBe("failed");
  });

  it("sorts by numeric marks or percentages for the selected mode", () => {
    expect(academicResultSortValue("marks", 12, 20)).toBe(12);
    expect(academicResultSortValue("percentage", 12, 20)).toBe(20);
  });
});
