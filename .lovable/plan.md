

## Plan: Enkel-modus for TimeTracker

Dette er en stor feature med 5+ uavhengige deler. Jeg anbefaler å implementere det i faser. Her er den komplette planen:

### Fase 1: Database-endringer (3 migrasjoner)

**Migration 1 — `breaks` tabell:**
```sql
CREATE TABLE public.breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  break_type text NOT NULL CHECK (break_type IN ('lunch_paid', 'lunch_unpaid', 'short_break')),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own breaks" ON public.breaks FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Migration 2 — `wage_settings` tabell:**
```sql
CREATE TABLE public.wage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  hourly_rate numeric NOT NULL DEFAULT 0,
  overtime_threshold numeric NOT NULL DEFAULT 7.5,
  overtime_multiplier numeric NOT NULL DEFAULT 1.5,
  default_lunch_minutes integer NOT NULL DEFAULT 30,
  lunch_is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wage settings" ON public.wage_settings FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Migration 3 — `app_mode` kolonne i profiles:**
```sql
ALTER TABLE public.profiles ADD COLUMN app_mode text NOT NULL DEFAULT 'simple';
```

### Fase 2: Nye hooks og hjelpefunksjoner

**`src/hooks/useAppMode.ts`** — Hook som leser `profile.app_mode` og gir `isSimpleMode` boolean + `setAppMode` funksjon. Oppdaterer profiles-tabellen.

**`src/hooks/useWageSettings.ts`** — CRUD for wage_settings med React Query. Henter/oppdaterer timesats, overtid-terskel, overtid-multiplikator, lunsjminutter, lunsj betalt/ubetalt.

**`src/hooks/useBreaks.ts`** — CRUD for breaks-tabellen. Henter pauser for en gitt time_entry_id. Start/stopp pause. Beregner total pausetid (betalt/ubetalt).

**`src/hooks/useSimpleTimer.ts`** — Kjerne-hook for enkel-modus. Bruker eksisterende `time_entries` tabell (ingen ny tabell). Logikk:
- Finner aktiv time_entry for bruker (uavhengig av prosjekt — bruker et "standard-prosjekt" som opprettes automatisk)
- Start/stopp/pause-funksjonalitet
- Beregner dagstotaler, overtid, og lønn i sanntid
- Returnerer `{ isRunning, isPaused, todaySeconds, overtimeSeconds, estimatedWage, startTimer, stopTimer, startBreak, endBreak }`

### Fase 3: Nye sider og komponenter

**`src/pages/SimpleTimer.tsx`** — Hovedskjerm for enkel-modus:
- Stor PLAY-knapp (120px+), stoppeklokke-estetikk med monospace font
- Sanntids-timer med `useEffect` + `setInterval` som teller opp HH:MM:SS
- Statusindikator: "Klar", "Jobber", "Pause", "Ferdig for dagen"
- Når aktiv: PAUSE og STOPP knapper erstatter PLAY
- Pause-dialog med valg: "Lunsj (ubetalt)", "Lunsj (betalt)", "Kort pause"
- Pause-timer når aktiv
- Lønnsberegning i sanntid nederst: Normal-tid x sats + Overtid x overtidssats = Total
- Automatisk overtid-markering etter terskel (gul farge)

**`src/pages/SimpleHistory.tsx`** — Historikk med kalendervisning:
- Månedlig kalender med fargekoding (grønn/gul/grå)
- Trykk på dag → vis detaljer (start, stopp, pauser, total, lønn)
- Uke- og månedsoppsummering
- Eksport-knapp for PDF/Excel (gjenbruk eksisterende `generate-project-report` edge function)

**`src/pages/WageSettings.tsx`** — Lønnsinnstillinger:
- Input-felt for timesats, overtidstillegg, terskel, standard lunsjtid
- Switch for om lunsj er betalt/ubetalt som default
- Lagre-knapp

### Fase 4: Modus-toggle og routing

**`src/pages/Settings.tsx`** — Legg til nytt Card øverst:
- "App-modus" med to knapper: "Enkel" og "Pro"
- Beskrivelse av hva som skjules/vises
- Lagrer i `profiles.app_mode`

**`src/App.tsx`** — Nye routes:
- `/simple` → SimpleTimer (inne i AppShell)
- `/simple/history` → SimpleHistory (inne i AppShell)
- `/simple/wage` → WageSettings (inne i AppShell)

**`src/components/AppShell.tsx`** — Betinget redirect:
- Hvis `profile.app_mode === 'simple'` og bruker navigerer til `/app`, redirect til `/simple`
- Oppdater header-tittel for nye sider

**`src/components/BottomTabBar.tsx`** — Betinget tabs:
- Enkel-modus: "Timer" (klokke-ikon), "Historikk" (kalender-ikon), "Mer" (same)
- Pro-modus: eksisterende tabs (Hjem, Notater, Mer)

### Fase 5: Oppdater useAuth

**`src/hooks/useAuth.ts`** — Legg til `app_mode` i Profile-interface slik at den hentes fra profiles.

### Datadeling mellom moduser

Enkel-modus oppretter automatisk et "Standard arbeidsdag"-prosjekt per bruker ved første bruk. All tid logges mot dette prosjektet via eksisterende `time_entries`-tabellen. Når bruker bytter til Pro-modus, ser de dette prosjektet som et vanlig prosjekt med alle tidsregistreringene. Ingen data går tapt.

### Tekniske detaljer

- Lønnsberegning er client-side (enkel aritmetikk, trenger ikke edge function)
- Timer bruker `setInterval(1000)` for å oppdatere visningen, men `start_time` fra DB er kilden til sannhet
- Kalendervisningen bruker eksisterende `react-day-picker` (allerede i prosjektet via Calendar-komponenten)
- Alle nye komponenter bruker eksisterende designsystem (Card, Button, Switch, etc.)
- Alle tekster på norsk

### Estimert omfang

- 3 database-migrasjoner
- 4 nye hooks
- 3 nye sider
- Endringer i 4 eksisterende filer (Settings, AppShell, BottomTabBar, App.tsx, useAuth)
- Ingen nye dependencies

