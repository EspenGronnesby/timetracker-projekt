/**
 * Lønnsberegning (Fase 3)
 *
 * Enkel modell for nå:
 *   - Brukeren setter timelønn brutto (NOK) og egen skatteprosent
 *   - Brutto = timer × timelønn
 *   - Netto  = brutto × (1 − skatteprosent/100)
 *
 * Fremtidig utvidelse (`tax_method: 'auto'`):
 *   - Norske trinnskatt-regler, trygdeavgift, frikort osv.
 *   - Datamodellen er allerede klar for det via tax_method-kolonnen.
 *
 * Alle beløp i norske kroner (NOK).
 */

export type SalaryInput = {
  totalSeconds: number;
  hourlyRateNok: number | null | undefined;
  taxPercentage: number | null | undefined;
};

export type SalaryResult = {
  hours: number;
  grossNok: number;
  netNok: number;
  taxAmountNok: number;
  isConfigured: boolean;
};

/**
 * Beregn brutto/netto lønn for et gitt antall sekunder arbeid.
 * Returnerer `isConfigured: false` hvis brukeren ikke har satt timelønn ennå.
 */
export function calculateSalary(input: SalaryInput): SalaryResult {
  const hours = input.totalSeconds / 3600;
  const rate = input.hourlyRateNok ?? 0;
  const taxPct = input.taxPercentage ?? 0;

  const grossNok = hours * rate;
  const taxAmountNok = grossNok * (taxPct / 100);
  const netNok = grossNok - taxAmountNok;

  return {
    hours,
    grossNok,
    netNok,
    taxAmountNok,
    isConfigured: rate > 0,
  };
}

/**
 * Formatter et NOK-beløp på norsk format: "1 234 kr" eller "1 234,50 kr".
 * Bruker non-breaking space som tusenskilletegn (norsk standard).
 */
export function formatNok(amount: number, options?: { decimals?: 0 | 2 }): string {
  const decimals = options?.decimals ?? 0;
  const formatted = new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${formatted} kr`;
}

/**
 * Formatter timer som "32t 15m" eller "7,5t" avhengig av kontekst.
 */
export function formatHours(hours: number, style: "short" | "long" = "long"): string {
  if (style === "short") {
    return `${hours.toFixed(1)}t`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}t`;
  return `${wholeHours}t ${minutes}m`;
}
