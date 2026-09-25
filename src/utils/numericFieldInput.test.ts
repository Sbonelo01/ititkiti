import { describe, expect, it } from "vitest";
import {
  parseNumericFieldValue,
  parsePositiveIntFieldValue,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "@/utils/numericFieldInput";

describe("sanitizeDecimalInput", () => {
  it("removes leading zeros while typing whole amounts", () => {
    expect(sanitizeDecimalInput("05")).toBe("5");
    expect(sanitizeDecimalInput("0100")).toBe("100");
  });

  it("allows free and decimal entry", () => {
    expect(sanitizeDecimalInput("0")).toBe("0");
    expect(sanitizeDecimalInput("99.50")).toBe("99.50");
    expect(sanitizeDecimalInput("0.5")).toBe("0.5");
  });
});

describe("sanitizeIntegerInput", () => {
  it("strips leading zeros on quantities", () => {
    expect(sanitizeIntegerInput("0100")).toBe("100");
    expect(sanitizeIntegerInput("0")).toBe("0");
  });
});

describe("parseNumericFieldValue", () => {
  it("treats empty as zero", () => {
    expect(parseNumericFieldValue("")).toBe(0);
    expect(parseNumericFieldValue("50")).toBe(50);
  });
});

describe("parsePositiveIntFieldValue", () => {
  it("requires positive integers", () => {
    expect(parsePositiveIntFieldValue("100")).toBe(100);
    expect(parsePositiveIntFieldValue("")).toBe(0);
    expect(parsePositiveIntFieldValue("0")).toBe(0);
  });
});
