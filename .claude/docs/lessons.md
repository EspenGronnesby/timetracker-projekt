# Lessons Learned

> Documentation of problems we've solved and how to avoid them in the future.
> Update this file whenever we learn something new.

---

## How to Use This File

**Claude Code automatic behavior:**
1. **Before solving a problem:** Check this file for similar issues
2. **If found:** Follow the documented solution
3. **After solving:** Ask the owner if this should be documented

---

## Entry Format

```markdown
### [Short title]
**Date:** YYYY-MM-DD
**Category:** Git | Supabase | React | TypeScript | Lovable | Other
**Affected files:** path/to/file.tsx, path/to/other.ts

**Problem:**
What went wrong?

**Solution:**
How did we fix it?

**Prevention:**
What should we do differently next time?
```

---

## Lessons

### Windows reserved filenames
**Date:** 2025-01
**Category:** Other
**Affected files:** N/A (system-level issue)

**Problem:**
File named `nul` crashed on Windows because it's a reserved system name.

**Solution:**
Deleted the file and renamed it.

**Prevention:**
Never create files named: `nul`, `con`, `prn`, `aux`, `com1-9`, `lpt1-9`

---

### RLS policies — bruk MCP eller SQL Editor
**Date:** 2025-01
**Category:** Supabase
**Affected files:** Database policies (Supabase Dashboard)

**Problem:**
Supabase-endringer ble ikke applisert fordi Claude Code ikke hadde direkte tilgang.

**Solution:**
Bruk Supabase MCP (`apply_migration` / `execute_sql`) eller be bruker kopiere SQL til Supabase SQL Editor.

**Prevention:**
- Vis alltid SQL til bruker FØR du kjører den
- Bruk MCP når tilgjengelig, ellers kodeblokk med "COPY AND RUN IN SUPABASE SQL EDITOR"
- Spør om det er gjort før du fortsetter

---

### npm install peer dependency conflicts
**Date:** 2026-03-17
**Category:** React
**Affected files:** package.json

**Problem:**
`npm install` feilet pga. peer dependency-konflikt med `react-day-picker@^8.10.1` og React 18.

**Solution:**
Bruk `npm install --legacy-peer-deps` for å omgå konflikten.

**Prevention:**
Sjekk alltid for peer dependency-konflikter ved nye installasjoner. Bruk `--legacy-peer-deps` hvis nødvendig.

---

### Dashboard-ruten er /app, ikke /
**Date:** 2026-03-17
**Category:** React
**Affected files:** src/App.tsx, src/pages/Auth.tsx, src/pages/Settings.tsx, src/pages/AdminPanel.tsx, src/pages/ProjectDetails.tsx

**Problem:**
Etter at landingssiden ble lagt til på `/`, ble dashboard flyttet til `/app`. Mange filer brukte `navigate("/")` for å gå til dashboard.

**Solution:**
Oppdaterte alle `navigate("/")` til `navigate("/app")` i Auth.tsx, Settings.tsx, AdminPanel.tsx, og ProjectDetails.tsx.

**Prevention:**
Aldri bruk `navigate("/")` for å gå til dashboard — bruk alltid `navigate("/app")`.

---

### GPS-koordinater lagres som JSON-streng
**Date:** 2026-03-17
**Category:** Supabase
**Affected files:** src/hooks/useProjects.ts, src/components/DriveDialog.tsx

**Problem:**
GPS-koordinater ble lagret som `"lat,lng"` streng som edge function ikke kunne parse.

**Solution:**
Lagre som `JSON.stringify({lat, lng})` og parse med `JSON.parse()` ved lesing. Edge function `calculate-driving-distance` støtter allerede `{lat, lng}` objekter.

**Prevention:**
Bruk alltid JSON-format for strukturerte data i tekstfelter. Sjekk at edge functions forstår formatet.

---

### Profile-type mangler nye felter
**Date:** 2026-03-17
**Category:** TypeScript
**Affected files:** src/hooks/useAuth.ts, src/pages/ProjectDetails.tsx, src/pages/Settings.tsx, src/components/WeatherWidget.tsx

**Problem:**
`show_cost_calculator`, `show_weather_widget`, og `show_weather_notifications` fantes i databasen men ikke i Profile-interfacet. Resulterte i `(profile as any)` casts overalt.

**Solution:**
La til de manglende feltene i Profile-interfacet i `useAuth.ts` og fjernet alle `as any` casts.

**Prevention:**
Når nye kolonner legges til i `profiles`-tabellen, oppdater alltid Profile-interfacet i `useAuth.ts` samtidig.

---

### DriveDialog dobbelt bekreftelse
**Date:** 2026-03-17
**Category:** React
**Affected files:** src/components/DriveDialog.tsx, src/components/DriveConfirmationDialog.tsx

**Problem:**
Kjøreregistrering krevde 2 dialoger — DriveDialog for start, DriveConfirmationDialog for bekreftelse. Unødvendig friksjon.

**Solution:**
Skrev om DriveDialog til å ha start-modus (1 klikk, GPS auto-capture) og stopp-modus (dialog med auto-beregning). Slettet DriveConfirmationDialog.

**Prevention:**
Minimer antall klikk for vanlige handlinger. Bruk GPS automatisk når tilgjengelig.

---

### Kjedet `.map().filter().map()` kan miste type-informasjon
**Date:** 2026-04-19
**Category:** TypeScript
**Affected files:** src/hooks/useProjects.ts

**Problem:**
`timeEntries.map(e => e.id).filter(e => !e.end_time).map(e => e.id)` — første map ga strings, deretter filter på `!e.end_time` som alltid er `!undefined = true` (strings har ikke `.end_time`), og siste map ga array av `undefined`. Hele `time_entry_pauses`-queryen kjørte med `[undefined, undefined, ...]` og returnerte null rader. Ingen type-feil fordi begge map-variantene er `string[]`.

**Solution:**
Bytt ut kjeden med `useMemo(() => timeEntries.map(e => e.id), [timeEntries])` siden intensjonen var "alle IDs".

**Prevention:**
- Ikke kjede flere map/filter på samme array uten å være 100% sikker på hva hver operasjon gjør med typen
- Når du vil filtrere på et objekt-felt, hold objektet så lenge du trenger det — ikke pluck ut før filter
- Hvis du pluck-er til string tidlig, kast `filter` i stedet

---

### localStorage er global — ikke per-bruker
**Date:** 2026-04-19
**Category:** React
**Affected files:** src/pages/Index.tsx, src/hooks/useColorTheme.ts, src/hooks/useUserStorage.ts

**Problem:**
Keys som `tt-sortBy`, `current_color_theme` og `recent_color_themes` var uprefikset. Når to kontoer brukte samme enhet (delt arbeidsmaskin, familie-PC), arvet den andre brukeren den første brukers preferanser.

**Solution:**
Ny `useUserStorage`-hook i `src/hooks/useUserStorage.ts` som prefikser alle keys med `tt:<userId>:`. Inkluderer engang-migrering av gamle keys til første bruker som logger inn etter oppgraderingen.

**Prevention:**
- Aldri skriv `localStorage.setItem("min-pref", ...)` for bruker-spesifikke ting
- Bruk alltid `useUserStorage(key, default)` for preferanser
- Enhets-globale ting (f.eks. "har sett intro") kan fortsatt være uprefikset

---

### RLS-policy `WITH CHECK (true)` er en åpen dør
**Date:** 2026-04-19
**Category:** Supabase
**Affected files:** supabase/migrations/20260419174435_tighten_notifications_insert.sql

**Problem:**
`notifications`-tabellen hadde INSERT-policy `WITH CHECK (true)` som lot enhver autentisert bruker opprette notifications for alle brukere — potensiell phishing/spam-vektor. I praksis satte klient-koden alltid egen user_id, men en ondsinnet klient kunne omgå.

**Solution:**
Bytt til `WITH CHECK (auth.uid() = user_id)`. Edge functions som trenger å insert'e for andre brukere (f.eks. `daily-summary`) bruker `SUPABASE_SERVICE_ROLE_KEY` som uansett bypasser RLS, så de er upåvirket.

**Prevention:**
- Aldri bruk `WITH CHECK (true)` på en tabell med `user_id`
- Når du skriver en ny migrasjon med RLS-policies, grep alltid for `WITH CHECK (true)` og `USING (true)` før du merger
- For "system"-innsettelser: bruk service_role fra edge functions, ikke åpen policy

---

### Idempotente vs ikke-idempotente retries
**Date:** 2026-04-19
**Category:** Supabase
**Affected files:** src/lib/invokeWithRetry.ts

**Problem:**
Det er fristende å retry alle edge function-kall ved 5xx/nettverksfeil. Men hvis funksjonen er ikke-idempotent (oppretter invites, sender e-post osv.) og første kall faktisk lyktes men returnerte 5xx pga timeout, vil retry skape en duplikat.

**Solution:**
`invokeWithRetry`-helper tar en `idempotent`-flag. Default false = ingen retry. Call-sites markerer eksplisitt `{ idempotent: true }` når funksjonen er GET-lignende (calculate-driving-distance, admin-get-users, calculate-project-cost, generate-project-report). POST/create-funksjoner (generate-project-invite, join-project-via-invite) beholder direkte invoke.

**Prevention:**
- Før du legger retry rundt et API-kall: spør "Hva skjer hvis dette kjører to ganger?"
- Hvis svaret er "to rader opprettes" → ikke retry, eller gjør operasjonen idempotent på serveren (unique constraint + upsert)
- Alltid retry bare på 5xx/nettverk, aldri på 4xx (input-feil)

---

### SQL til bruker — kun ren SQL i kodeblokk
**Date:** 2026-04-19
**Category:** Other
**Affected files:** N/A (kommunikasjon)

**Problem:**
Ga bruker SQL med forklarende tekst rundt ("Hva den gjør: ...") i chat. Bruker kopierte hele blokken inn i Supabase SQL editor og fikk `syntax error at or near "Hva"`.

**Solution:**
Når bruker skal kjøre SQL manuelt: gi KUN ren SQL inni én kodeblokk med språk `sql`. All forklaring legges ETTER kodeblokken, ikke foran eller inni.

**Prevention:**
Mal: `Her er SQL-en (kopier kun mellom ```-linjene):` + kodeblokk + kort oppsummering etter. Ingenting "smart" eller i-lag.

---

### N+1 pattern i sort-funksjoner
**Date:** 2026-04-19
**Category:** React
**Affected files:** src/pages/Index.tsx

**Problem:**
`list.sort((a, b) => timeEntries.filter(e => e.project_id === a.id).reduce(...))` — sort-comparator kalles O(n log n) ganger, og hver gang filtreres hele `timeEntries`-arrayen. Med 50 prosjekter × 500 entries = ~25 000 iterasjoner per sort.

**Solution:**
Bygg en `projectTimeMap: Map<string, number>` én gang via `useMemo([timeEntries])` som summer duration per project_id. Sort-comparator gjør kun `map.get(id)` → O(1).

**Prevention:**
- Hvis du kaller `array.filter(...)` inni en loop/sort, bygg en lookup-struktur (Map eller Set) først
- Regel: sort-comparators skal være O(1). Er de ikke det, bygg map/memo utenfor

---

<!--
ADD NEW LESSONS BELOW

Use the format above. Keep it short and concrete.
-->
