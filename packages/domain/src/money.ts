/**
 * FeSCo Money Value Object
 *
 * All financial math is stored and calculated in integer pesewas (1 GH₵ = 100 pesewas).
 * Floating-point representation is strictly prohibited in financial calculations
 * to eliminate rounding drift and guarantee host cost-recovery mathematical proofs.
 */

export class Money {
  readonly pesewas: number;

  private constructor(pesewas: number) {
    if (!Number.isSafeInteger(pesewas)) {
      throw new TypeError(`Pesewas amount must be a safe integer, received: ${pesewas}`);
    }
    this.pesewas = pesewas;
  }

  static zero(): Money {
    return new Money(0);
  }

  static fromPesewas(pesewas: number): Money {
    return new Money(Math.round(pesewas));
  }

  /**
   * Constructs Money from Cedis (e.g. 14.50 -> 1450 pesewas).
   */
  static fromCedis(cedis: number): Money {
    return new Money(Math.round(cedis * 100));
  }

  add(other: Money): Money {
    return new Money(this.pesewas + other.pesewas);
  }

  subtract(other: Money): Money {
    return new Money(this.pesewas - other.pesewas);
  }

  multiply(scalar: number): Money {
    return new Money(Math.round(this.pesewas * scalar));
  }

  /**
   * Divides pesewas by an integer divisor, always flooring down
   * to guarantee that sum of divided parts NEVER exceeds total.
   */
  floorDivide(divisor: number): Money {
    if (divisor <= 0) {
      throw new RangeError('Divisor must be greater than zero');
    }
    return new Money(Math.floor(this.pesewas / divisor));
  }

  toCedis(): number {
    return this.pesewas / 100;
  }

  /**
   * Formats for UI display: "GH₵ 14.00"
   */
  toFormattedCedis(): string {
    const cedis = (this.pesewas / 100).toFixed(2);
    return `GH₵ ${cedis}`;
  }

  isZero(): boolean {
    return this.pesewas === 0;
  }

  isPositive(): boolean {
    return this.pesewas > 0;
  }

  isNegative(): boolean {
    return this.pesewas < 0;
  }

  equals(other: Money): boolean {
    return this.pesewas === other.pesewas;
  }

  greaterThan(other: Money): boolean {
    return this.pesewas > other.pesewas;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.pesewas >= other.pesewas;
  }

  lessThan(other: Money): boolean {
    return this.pesewas < other.pesewas;
  }

  lessThanOrEqual(other: Money): boolean {
    return this.pesewas <= other.pesewas;
  }
}

/**
 * Standard Ghanaian Cedis currency presentation formatter.
 * Formats integer pesewas into GH₵ string: 1400 -> "GH₵ 14.00"
 */
export function formatPesewasToGhc(amountInPesewas: number): string {
  const cedis = (amountInPesewas / 100).toFixed(2);
  return `GH₵ ${cedis}`;
}
