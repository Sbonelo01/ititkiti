import { describe, expect, it } from "vitest";
import {
  SERVICE_FEE_PER_TICKET,
  computeBuyerServiceFeeTotalZar,
  computeBuyerServiceFeeZar,
  roundZar,
  zarToKobo,
} from "@/constants/pricing";

describe("computeBuyerServiceFeeZar", () => {
  it("charges R5 below R50", () => {
    expect(computeBuyerServiceFeeZar(0)).toBe(5);
    expect(computeBuyerServiceFeeZar(1)).toBe(5);
    expect(computeBuyerServiceFeeZar(49.99)).toBe(5);
  });

  it("charges R10 from R50 through R200", () => {
    expect(computeBuyerServiceFeeZar(50)).toBe(10);
    expect(computeBuyerServiceFeeZar(50)).toBe(SERVICE_FEE_PER_TICKET);
    expect(computeBuyerServiceFeeZar(100)).toBe(10);
    expect(computeBuyerServiceFeeZar(200)).toBe(10);
  });

  it("charges 5% above R200, rounded to cents", () => {
    expect(computeBuyerServiceFeeZar(220)).toBe(11);
    expect(computeBuyerServiceFeeZar(250)).toBe(12.5);
    expect(computeBuyerServiceFeeZar(201)).toBe(10.05);
    expect(computeBuyerServiceFeeZar(333)).toBe(16.65);
  });

  it("returns 0 for non-finite or negative prices", () => {
    expect(computeBuyerServiceFeeZar(Number.NaN)).toBe(0);
    expect(computeBuyerServiceFeeZar(Number.POSITIVE_INFINITY)).toBe(0);
    expect(computeBuyerServiceFeeZar(-10)).toBe(0);
  });
});

describe("computeBuyerServiceFeeTotalZar", () => {
  it("sums per-ticket fees across mixed prices", () => {
    // 2× R40 → R5 each; 1× R100 → R10; 1× R250 → R12.50
    expect(computeBuyerServiceFeeTotalZar([40, 40, 100, 250])).toBe(32.5);
  });
});

describe("zarToKobo / roundZar", () => {
  it("converts rounded ZAR totals to integer kobo", () => {
    expect(zarToKobo(115.5)).toBe(11550);
    expect(roundZar(10.055)).toBe(10.06);
  });
});
