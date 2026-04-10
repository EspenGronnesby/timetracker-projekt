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

<!--
ADD NEW LESSONS BELOW

Use the format above. Keep it short and concrete.
-->
