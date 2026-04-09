/**
 * Overtidsberegning etter norske regler
 *
 * JURIDISK GRUNNLAG:
 * - Arbeidsmiljøloven §10-6: Overtid = arbeid utover avtalte normale arbeidstimer
 * - Minstekomp: 40% tillegg på timelønn
 * - Vanlig praksis (de fleste tariffavtaler):
 *   • 50% tillegg for hverdags-overtid (man-fre, dagtid)
 *   • 100% tillegg for kveld/natt/søndager/høytidsdager
 *
 * KOMPENSASJONSMETODER:
 * 1. "money" (utbetaling): Overtidskompensasjon betales direkte i kontanter
 * 2. "avspasering" (fri): Overtidstimer tas som fri senere
 *    - Men SUPPLEMENT (50%/100%) blir ALLTID betalt i kontanter per lov
 *
 * VIKTIG DETALJ:
 * Daglige og ukentlige overtid kan overlappe. Bruker MAKSIMUM av:
 *   - Sum av daglige overskudd (timer > normalHoursPerDay)
 *   - Ukentlig overskudd (total > normalHoursPerWeek)
 * Dette unngår dobbeltelling.
 */

import {
  startOfWeek,
  endOfDay,
  startOfDay,
  addDays,
  isWithinInterval,
  parseISO,
} from "date-fns";

/**
 * En tidsregistrering (enkel versjon for overtidsberegning).
 * Hentet fra time_entries-tabellen i Supabase.
 */
export type TimeEntryLite = {
  id: string;
  start_time: string; // ISO 8601, f.eks. "2024-01-15T08:00:00Z"
  end_time: string | null; // ISO 8601 eller null (pågående innlegg)
  duration_seconds: number;
  is_overtime?: boolean | null; // Eksplisitt markering som overtid
  overtime_rate?: number | null; // 50 eller 100 (%)
  comp_method?: "money" | "avspasering" | null; // Kompensasjonsmetode
};

/**
 * Konfigurering for overtidsberegning.
 * Disse verdiene hentes fra brukerens innstillinger (profile.normal_hours_per_day osv).
 */
export type OvertimeConfig = {
  normalHoursPerDay: number; // Standard 7.5 timer/dag
  normalHoursPerWeek: number; // Standard 37.5 timer/uke
};

/**
 * Beregn totalt antall sekunder arbeidet (kun fullførte innlegg med end_time).
 * Ignorerer innlegg som fortsatt pågår (end_time === null).
 */
export function totalSeconds(entries: TimeEntryLite[]): number {
  return entries
    .filter((e) => e.end_time !== null)
    .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
}

/**
 * Summer timer innenfor et dato-område.
 * Område: [start, end), dvs. start er inkludert, end er ekskludert.
 *
 * @param entries Liste med tidsregistreringer
 * @param start Startdato (inkludert)
 * @param end Sluttdato (ekskludert)
 * @returns Totalt antall sekunder i området
 */
export function sumInRange(
  entries: TimeEntryLite[],
  start: Date,
  end: Date
): number {
  const startDate = startOfDay(start);
  const endDate = startOfDay(end);

  return entries
    .filter((e) => {
      if (!e.end_time) return false; // Ignorer pågående innlegg
      const entryDate = parseISO(e.start_time);
      return isWithinInterval(entryDate, {
        start: startDate,
        end: addDays(endDate, -1), // Gjør end eksklusiv
      });
    })
    .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
}

/**
 * Beregn overtid for en ENKELTDAG.
 * Returnerer normale timer og overtidstimer (50% og 100% kategori hver).
 *
 * LOGIKK:
 * - Hvis det finnes eksplisitt markerte overtid-innlegg (is_overtime === true),
 *   brukes disse (og deres overtime_rate).
 * - Ellers: Alle timer utover normalHoursPerDay regnes som overtid (50% default).
 * - Beregner både 50% og 100% kategorier separat basert på overtime_rate.
 *
 * @param dayEntries Alle innlegg for dagen (f.eks. filtrert på samme dato)
 * @param config Normale arbeidstimer per dag
 * @returns Objekt med normal/overtid-timer, fordelt på 50%/100%
 */
export function calculateDailyOvertime(
  dayEntries: TimeEntryLite[],
  config: OvertimeConfig
): {
  normalHours: number;
  overtimeHours: number;
  rate50Hours: number;
  rate100Hours: number;
} {
  const completedEntries = dayEntries.filter((e) => e.end_time !== null);

  if (completedEntries.length === 0) {
    return {
      normalHours: 0,
      overtimeHours: 0,
      rate50Hours: 0,
      rate100Hours: 0,
    };
  }

  // Sjekk om det finnes eksplisitt overtid-innlegg
  const hasExplicitOvertime = completedEntries.some((e) => e.is_overtime === true);

  let normalHours = 0;
  let rate50Hours = 0;
  let rate100Hours = 0;

  if (hasExplicitOvertime) {
    // Bruk eksplisitte markeringer
    for (const entry of completedEntries) {
      const hours = entry.duration_seconds / 3600;
      if (entry.is_overtime === true) {
        const rate = entry.overtime_rate ?? 50;
        if (rate === 100) {
          rate100Hours += hours;
        } else {
          rate50Hours += hours;
        }
      } else {
        normalHours += hours;
      }
    }
  } else {
    // Auto-detect: timer utover normalHoursPerDay er overtid
    const totalHours = completedEntries.reduce((sum, e) => sum + e.duration_seconds / 3600, 0);
    const overtimeTotalHours = Math.max(0, totalHours - config.normalHoursPerDay);
    normalHours = totalHours - overtimeTotalHours;
    rate50Hours = overtimeTotalHours; // Standard 50% hvis ikke spesifisert annet
  }

  const overtimeHours = rate50Hours + rate100Hours;

  return {
    normalHours: parseFloat(normalHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
    rate50Hours: parseFloat(rate50Hours.toFixed(2)),
    rate100Hours: parseFloat(rate100Hours.toFixed(2)),
  };
}

/**
 * Beregn overtid for en HELEUKE.
 * Summerer alle innlegg i uken og beregner både:
 *   - dailyOvertimeSum: Sum av daglige overskudd (timer > normalHoursPerDay hver dag)
 *   - weeklyOvershoot: Ukentlig overskudd (total > normalHoursPerWeek)
 * Bruker det STØRSTE av disse to tallene for å unngå dobbeltelling.
 *
 * Fordeler overtid på 50% og 100% kategori basert på eksplisitte markeringer.
 *
 * @param weekEntries Alle innlegg for uken
 * @param weekStart Mandag i uken (brukes for beregning av dag-grenser)
 * @param config Normale arbeidstimer per dag og per uke
 * @returns Oversikt over timer (normal/overtid, fordelt på 50%/100%)
 */
export function calculateWeeklyOvertime(
  weekEntries: TimeEntryLite[],
  weekStart: Date,
  config: OvertimeConfig
): {
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  rate50Hours: number;
  rate100Hours: number;
} {
  const completedEntries = weekEntries.filter((e) => e.end_time !== null);

  if (completedEntries.length === 0) {
    return {
      totalHours: 0,
      normalHours: 0,
      overtimeHours: 0,
      rate50Hours: 0,
      rate100Hours: 0,
    };
  }

  // Beregn per dag først
  let dailyOvertimeSum = 0;
  let dailyRate50Sum = 0;
  let dailyRate100Sum = 0;

  for (let i = 0; i < 7; i++) {
    const dayStart = addDays(weekStart, i);
    const dayEnd = addDays(dayStart, 1);

    const dayEntries = completedEntries.filter((e) => {
      const entryDate = parseISO(e.start_time);
      return isWithinInterval(entryDate, {
        start: startOfDay(dayStart),
        end: endOfDay(dayStart),
      });
    });

    if (dayEntries.length > 0) {
      const dailyCalc = calculateDailyOvertime(dayEntries, config);
      dailyOvertimeSum += dailyCalc.overtimeHours;
      dailyRate50Sum += dailyCalc.rate50Hours;
      dailyRate100Sum += dailyCalc.rate100Hours;
    }
  }

  // Beregn ukentlig overskudd
  const totalSeconds = completedEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  const totalHours = totalSeconds / 3600;
  const normalHoursInWeek = config.normalHoursPerWeek;
  const weeklyOvershoot = Math.max(0, totalHours - normalHoursInWeek);

  // Bruk maksimum av daglig og ukentlig beregning
  const overtimeHours = Math.max(dailyOvertimeSum, weeklyOvershoot);

  // For 50/100 split: hvis overtid fra daglig > ukentlig, bruk daglig split
  // Ellers, hvis ukentlig > daglig, tildel overskuddet proporsjonalt
  let rate50Hours: number;
  let rate100Hours: number;

  if (dailyOvertimeSum >= weeklyOvershoot) {
    rate50Hours = dailyRate50Sum;
    rate100Hours = dailyRate100Sum;
  } else {
    // Ukentlig overskudd > daglig: skalér ned daglig split
    if (dailyOvertimeSum > 0) {
      const ratio = weeklyOvershoot / dailyOvertimeSum;
      rate50Hours = dailyRate50Sum * ratio;
      rate100Hours = dailyRate100Sum * ratio;
    } else {
      // Ingen daglig overtid, hele weeklyOvershoot som rate50 default
      rate50Hours = weeklyOvershoot;
      rate100Hours = 0;
    }
  }

  const normalHours = totalHours - overtimeHours;

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    normalHours: parseFloat(normalHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
    rate50Hours: parseFloat(rate50Hours.toFixed(2)),
    rate100Hours: parseFloat(rate100Hours.toFixed(2)),
  };
}

/**
 * Beregn overtid for et VILKÅRLIG TIDSROM.
 * Deler perioden opp i ISO-uker (mandag-søndag) og summerer hver uke.
 * Brukes for månedsoversikt og rapporter.
 *
 * @param entries Alle innlegg i perioden
 * @param rangeStart Startdato (inkludert)
 * @param rangeEnd Sluttdato (ekskludert)
 * @param config Normale arbeidstimer per dag og per uke
 * @returns Akkumulert oversikt for hele perioden
 */
export function calculateRangeOvertime(
  entries: TimeEntryLite[],
  rangeStart: Date,
  rangeEnd: Date,
  config: OvertimeConfig
): {
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  rate50Hours: number;
  rate100Hours: number;
} {
  let totalHours = 0;
  let normalHours = 0;
  let rate50Hours = 0;
  let rate100Hours = 0;

  // Iterer gjennom uker i perioden
  let currentWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 }); // Mandag = 1

  while (currentWeekStart < rangeEnd) {
    const currentWeekEnd = addDays(currentWeekStart, 7);

    // Filtrer innlegg for denne uken
    const weekEntries = entries.filter((e) => {
      if (!e.end_time) return false;
      const entryDate = parseISO(e.start_time);
      return isWithinInterval(entryDate, {
        start: startOfDay(currentWeekStart),
        end: endOfDay(addDays(currentWeekEnd, -1)),
      });
    });

    if (weekEntries.length > 0) {
      const weekCalc = calculateWeeklyOvertime(weekEntries, currentWeekStart, config);
      totalHours += weekCalc.totalHours;
      normalHours += weekCalc.normalHours;
      rate50Hours += weekCalc.rate50Hours;
      rate100Hours += weekCalc.rate100Hours;
    }

    currentWeekStart = currentWeekEnd;
  }

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    normalHours: parseFloat(normalHours.toFixed(2)),
    overtimeHours: parseFloat((rate50Hours + rate100Hours).toFixed(2)),
    rate50Hours: parseFloat(rate50Hours.toFixed(2)),
    rate100Hours: parseFloat(rate100Hours.toFixed(2)),
  };
}

/**
 * Beregn avspaseringssaldo (frigjøring/kompensasjonstid).
 * Summer alle innlegg merket som is_overtime === true OG comp_method === 'avspasering'.
 * Disse timene gis som positiv balanse (tilgjengelig fritid).
 *
 * MERK: Dette er v1 og trekker IKKE fra "brukt" avspasering ennå.
 * Brukt avspasering må håndteres i en senere versjon.
 *
 * @param entries Alle tidsregistreringer
 * @returns Antall timer tilgjengelig som avspasering
 */
export function calculateAvspaseringBalance(entries: TimeEntryLite[]): number {
  const completedEntries = entries.filter((e) => e.end_time !== null);
  const avspaseringHours = completedEntries
    .filter((e) => e.is_overtime === true && e.comp_method === "avspasering")
    .reduce((sum, e) => sum + e.duration_seconds / 3600, 0);

  return parseFloat(avspaseringHours.toFixed(2));
}

/**
 * Beregn bruttolønnsutbetaling basert på timer og sats.
 *
 * FORMEL:
 *   normalHours × hourlyRate +
 *   rate50Hours × hourlyRate × (1 + 50/100) +
 *   rate100Hours × hourlyRate × (1 + 100/100)
 *
 * VIKTIG OM AVSPASERING:
 * Hvis et overtid-innlegg har comp_method === 'avspasering', betales IKKE
 * basestundene ut (de tas som fri senere), men SUPPLEMENTET (50% eller 100%)
 * blir ALLTID utbetalt i kontanter per norsk lov.
 *
 * For enkelthet i v1 godtar vi at denne funksjonen behandler all overtid som
 * fullt utbetalt. Avspaseringssaldoen vises separat via calculateAvspaseringBalance().
 *
 * @param input Normal/overtid-timer og timelønn
 * @returns Bruttolønnsutbetaling i NOK
 */
export function calculateGross(input: {
  normalHours: number;
  rate50Hours: number;
  rate100Hours: number;
  hourlyRateNok: number;
}): number {
  const { normalHours, rate50Hours, rate100Hours, hourlyRateNok } = input;

  if (hourlyRateNok <= 0) return 0;

  const normalPay = normalHours * hourlyRateNok;
  const rate50Pay = rate50Hours * hourlyRateNok * 1.5; // 150% = normal + 50%
  const rate100Pay = rate100Hours * hourlyRateNok * 2.0; // 200% = normal + 100%

  const total = normalPay + rate50Pay + rate100Pay;
  return parseFloat(total.toFixed(2));
}
