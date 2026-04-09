# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

## Rule Precedence

**Bruker har ALLTID høyeste prioritet.** Se `.claude/rules/precedence.md` for detaljer.

```
#1 BRUKER (din eksplisitte instruks) → trumfer alt
#2 CLAUDE.MD (denne filen)
#3 SKILLS (.claude/skills/)
#4 RULES (.claude/rules/)
#5 DOCS (.claude/docs/)
```

---

## .claude/ Structure

```
.claude/
├── CLAUDE.md                      # ← DU ER HER. Global kontekst og kart.
│
├── rules/                         # Harde begrensninger
│   ├── precedence.md              # Hva vinner ved konflikt
│   └── severity.md                # Feilhåndtering (🔴🟡🔵)
│
├── skills/                        # Aktive atferder (hvordan tenke)
│   ├── scope-guard.md             # Forhindre feature creep
│   ├── security-review.md         # Sikkerhetstenkning
│   ├── verify.md                  # Dobbeltsjekk og kvalitet
│   ├── secret-guard.md            # Beskytt hemmeligheter (ALLTID aktiv)
│   ├── ui-ux-review.md            # Apple/Ive designstandard
│   └── webapp-testing.md          # Test brukerreiser med Playwright
│
├── profiles/                      # Prosjektprofiler (velg én)
│   ├── web-lovable.md             # Lovable + Supabase ← AKTIV
│   ├── web-nextjs.md              # Next.js + Vercel + Supabase
│   └── app-ios.md                 # Expo + React Native + App Store
│
└── docs/                          # Referansemateriale (fasit/historikk)
    ├── kickoff.md                 # Prosjektplan
    ├── stack.md                   # Godkjent tech + blacklist
    ├── security.md                # Lang sikkerhetsreferanse
    └── lessons.md                 # Erfaringer og løsninger
```

**Skills** = korte filer som sier hvordan du skal tenke.
**Profiles** = velg én per prosjekt, definerer stack og regler.
**Docs** = lange filer du slår opp i når du trenger detaljer.

---

## Project Overview

> Timetracker — tidsregistrering, kjøresporing og materialregistrering for norske håndverkere og entreprenører med mange små prosjekter.

## Profile

> **web-lovable** — Lovable + Supabase
> Se `.claude/profiles/web-lovable.md` for full stack-referanse.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 5.4, React 18.3, TypeScript 5.8 |
| UI | Tailwind CSS 3.4, shadcn/ui (Radix), lucide-react |
| Router | react-router-dom 6.30 |
| State/Data | TanStack React Query 5 |
| Forms/Validation | Zod |
| Backend | Supabase (Postgres, Auth, Edge Functions, Realtime) |
| Charts | Recharts |
| Export | jsPDF, xlsx |
| Date | date-fns |
| PWA | vite-plugin-pwa |
| Hosting | Lovable Cloud |
| Version Control | GitHub (privat repo) |

## Development Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
npx tsc --noEmit     # TypeScript type check
```

## Project Structure

```
src/
├── components/          # 25 custom components + shadcn/ui
│   └── ui/              # shadcn/ui (ikke rediger manuelt)
├── pages/               # 9 sider (én per route)
├── hooks/               # 7 custom hooks
├── integrations/
│   └── supabase/        # Auto-generert (types.ts, client.ts)
├── lib/                 # Utils
├── types/               # TypeScript types
├── App.tsx              # Router
├── main.tsx             # Entry point
└── index.css            # Global styles + 6 temaer (CSS variables)

supabase/
└── functions/           # 10 Edge Functions (Deno/TypeScript)
```

## Route Structure

| Route | Side | Beskrivelse |
|-------|------|-------------|
| `/` | Landing | Offentlig landingsside |
| `/app` | Index | Dashboard (krever auth) |
| `/auth` | Auth | Login/registrering |
| `/project/:id` | ProjectDetails | Prosjektdetaljer med timer/kjøring/materialer |
| `/goals` | Goals | Daglige mål (lazy) |
| `/settings` | Settings | Brukerinnstillinger (lazy) |
| `/admin` | AdminPanel | Admin-panel (lazy, krever admin-rolle) |
| `/join/:inviteCode` | JoinProject | Prosjektinvitasjon (lazy) |

**Viktig:** Dashboard er på `/app`, IKKE `/`. Auth redirecter til `/app` etter innlogging.

## Key Hooks

| Hook | Formål |
|------|--------|
| `useAuth` | Auth state, session, profil, sign out |
| `useProjects` | Prosjekter, tidsregistreringer, kjøring, materialer (React Query) |
| `useFavoriteAddresses` | CRUD for favorittadresser |
| `useColorTheme` | Temavalg (6 temaer) med localStorage + Supabase sync |
| `useUserRole` | Brukerrolle (admin/user), `useIsAdmin` helper |
| `useMobile` | Responsiv breakpoint-deteksjon (768px) |
| `useToast` | Toast-notifikasjoner |

## Database (Supabase)

### Tables

| Tabell | Formål |
|--------|--------|
| `profiles` | Brukerprofiler og innstillinger |
| `projects` | Prosjekter med kundeinformasjon |
| `project_members` | Teammedlemskap (rolle: owner/member) |
| `project_invites` | Invitasjonskoder |
| `time_entries` | Tidsregistreringer (start/stopp/varighet) |
| `drive_entries` | Kjøreregistreringer (GPS, km, rute) |
| `materials` | Materialkostnader |
| `favorite_addresses` | Favorittadresser for kjøring |
| `goal_lists` | Mållister |
| `goal_tasks` | Individuelle mål |
| `organizations` | Organisasjoner |
| `user_organizations` | Bruker-org-relasjoner |
| `user_roles` | Rolletilordninger (admin/user) |
| `user_streaks` | Streak-sporing |
| `notifications` | Brukernotifikasjoner |
| `notification_preferences` | Notifikasjonsinnstillinger |
| `user_fcm_tokens` | Push notification tokens |
| `weather_notifications` | Værvarslinger |
| `customer_users` | Kundeinnlogging |

### Views

| View | Formål |
|------|--------|
| `projects_secure_member_view` | Rollebasert filtrering av kundeinformasjon |
| `customer_projects_view` | Kundeportal prosjektvisning |

### Database Functions

| Funksjon | Formål |
|----------|--------|
| `create_project` | Sikker prosjektopprettelse via RPC |
| `is_admin` | Admin-rollesjekk |
| `can_access_customer_data` | RLS for kundedata |
| `can_access_project_sensitive_data` | RLS for sensitiv prosjektdata |

### Edge Functions

| Funksjon | Formål |
|----------|--------|
| `calculate-driving-distance` | Beregn avstand mellom GPS-koordinater |
| `calculate-project-cost` | Beregn prosjektkostnader |
| `generate-project-report` | Generer PDF/eksport-rapport |
| `generate-project-invite` | Opprett invitasjonskoder |
| `join-project-via-invite` | Løs inn invitasjonskode |
| `admin-get-users` | Hent brukere for admin-panel |
| `customer-login` | Kundeautentisering (verify_jwt = false) |
| `customer-get-projects` | Hent prosjekter for kundeportal |
| `daily-summary` | Daglig arbeidsoppsummering |
| `check-weather-forecast` | Værvarsling |

### Supabase Integration

- Client: `src/integrations/supabase/client.ts`
- Types: `src/integrations/supabase/types.ts` (auto-generert, ikke rediger)
- Edge Functions: `supabase/functions/`
- Project ID: `odbqdzmdlelotqfuxbwf`

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (offentlig)
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

Alle `VITE_*` variabler er offentlige by design (Vite-konvensjon).

---

## Working Rules

### Git Workflow

**ALWAYS create a new branch before making changes. Never commit directly to `main`.**

```bash
git checkout -b feature/description   # or fix/, refactor/, chore/
git commit -m "type: short description"
git push origin branch-name
```

### Supabase Database Changes

**Claude Code kan kjøre SQL via Supabase MCP.**

Sikkerhetsregler for MCP:
1. ALDRI kjør destruktive queries (DROP, TRUNCATE, DELETE uten WHERE) uten å spørre bruker først
2. Bruk `apply_migration` for skjemaendringer (DDL), `execute_sql` for spørringer
3. Vis alltid SQL til bruker FØR du kjører den: "Skal jeg kjøre denne SQL?"
4. Ved tvil: skriv SQL i kodeblokk og la bruker bestemme

### Windows Compatibility

Never create files named: `nul`, `con`, `prn`, `aux`, `com1-9`, `lpt1-9`

### Communication

The owner is learning. Always explain simply what's happening and why. Give a brief summary after each change. Communicate in Norwegian.

---

## Automatic Behaviors

### At project start (new projects only)
1. **Kickoff** (`.claude/docs/kickoff.md`):
   - Fyll ut kickoff.md basert på brukers beskrivelse
   - Les riktig profil fra `.claude/profiles/`
   - Sjekk `.claude/docs/stack.md` for godkjent tech
   - Presenter utfylt kickoff til bruker
   - **IKKE START KODING** før bruker godkjenner

### ALWAYS active (alle oppgaver)
1. **Secret guard** (`.claude/skills/secret-guard.md`):
   - Les ALDRI .env direkte. Bruk .env.example.
   - Vis ALDRI hemmeligheter i terminal, kontekst, eller git.
   - Stopp umiddelbart ved lekkasje-mønster.

### Before ANY code task
1. **Scope guard** (`.claude/skills/scope-guard.md`):
   - Kan du definere oppgaven i én setning? Hvis nei → spør bruker
   - Løs nøyaktig det som ble spurt om, ikke mer
   - Ikke legg til dependencies, refaktorer, eller endre filer uten å spørre

2. **Arbeidsmodus-vurdering:**
   Vurder oppgavens størrelse og kompleksitet, og anbefal riktig modus:

   ```
   VANLIG SESSION (standard):
   → Oppgaven handler om én ting (fiks bug, legg til komponent, endre stil)
   → Endringer i 1-3 filer
   → Sekvensiell arbeid (steg A før steg B)
   → Billigst og raskest

   SUBAGENTS:
   → Oppgaven har 2-3 uavhengige deler som ikke påvirker hverandre
   → Delene trenger ikke kommunisere
   → Eksempel: "Oppdater 5 sider med ny footer" (samme jobb, mange filer)
   → Raskere enn én og én, billigere enn team

   AGENT TEAMS:
   → Oppgaven har flere ULIKE deler som berører ulike filer
   → Delene må koordinere (frontend trenger å vite API-format fra backend)
   → Eksempel: "Bygg nytt notifikasjonssystem" (UI + API + DB + tester)
   → Kraftigst, men bruker 4-5x tokens
   ```

   **Hvis vanlig session:** Bare fortsett, ikke si noe.
   **Hvis subagents eller team anbefales:**

   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │  🛠️ ARBEIDSMODUS                                                │
   │                                                                 │
   │  Denne oppgaven har [X] uavhengige deler:                       │
   │  • [del 1]                                                      │
   │  • [del 2]                                                      │
   │  • [del 3]                                                      │
   │                                                                 │
   │  Anbefaling: [subagents/agent team]                              │
   │  Hvorfor: [kort forklaring]                                     │
   │  Kostnad: ~[X]x token-bruk vs vanlig session                    │
   │                                                                 │
   │  Alternativ: Jeg kan også gjøre det som vanlig session,         │
   │  men det tar lengre tid fordi [grunn].                           │
   │                                                                 │
   │  Hva foretrekker du?                                            │
   └─────────────────────────────────────────────────────────────────┘
   ```

   **VENT** på brukers valg før du starter arbeidet.

### Before solving a problem
1. Check `.claude/docs/lessons.md` for similar issues
2. If found, follow the documented solution
3. If not found, solve and then document

### When touching auth, RLS, input, or Edge Functions
1. Aktiver **security review** (`.claude/skills/security-review.md`)
2. Sjekk false positive-listen i `.claude/docs/security.md` FØR du flagger
3. Kun flagg det du kan bevise

### After changing code
1. Run **verification** (`.claude/skills/verify.md`) unless bruker sier hopp over
2. Report result using the formats in that file

### After solving a problem
1. Ask: "Skal jeg legge dette til i docs/lessons.md?"
2. If yes, add using the format in that file

---

## Severity Levels

See `.claude/rules/severity.md` for full details.

| Level | Handling |
|-------|----------|
| 🔴 CRITICAL | STOPP, rapporter, vent på bruker |
| 🟡 WARNING | Rapporter, men fortsett |
| 🔵 INFO | Nevn hvis relevant |

---

## State Tracking

When working on multi-step tasks, use this format:

```
Plan:
1. [ ] First task
2. [ ] Second task
3. [ ] Verification

Status:
1. [✓] First task - FERDIG
2. [ ] Second task - NESTE
3. [ ] Verification
```

### Forbudt språk:
- ❌ "Jeg antar at..."
- ❌ "Dette burde..."
- ❌ "Sannsynligvis..."

### Påkrevd språk:
- ✅ "Bekreftet: [kommando] returnerte [resultat]"
- ✅ "Verifisert: [hva som ble sjekket]"
- ✅ "Venter på: [hva bruker må gjøre]"

---

## Verification (Quick Reference)

Full details in `.claude/skills/verify.md`.

```
WHEN TO VERIFY:
✅ Changed .ts, .tsx, .js, .jsx files
✅ Changed package.json
✅ Changed config files (vite.config, tsconfig)
❌ Only changed .md, .css, or comments

VERIFICATION STEPS:
1. npm run build     (maks 3 forsøk)
2. npm run lint      (maks 2 forsøk, hvis tilgjengelig)
3. npx tsc --noEmit  (maks 3 forsøk, hvis TypeScript)

ON FAILURE:
🔴 STOPP → RAPPORTER → VENT på bruker
```

### Bruker kan alltid si:
- "Hopp over verify" → Skip verification
- "Ignorer feil" → Fortsett selv ved feil

---

## Project-Specific Notes

- Dashboard-ruten er `/app`, IKKE `/`. Landing page er på `/`.
- GPS-basert kjøring: Start lagrer GPS som JSON `{lat, lng}` i `start_location`, stopp henter ny GPS og beregner avstand via edge function `calculate-driving-distance`.
- Prosjekter hentes via `projects_secure_member_view` som filtrerer kundeinformasjon basert på rolle (owner ser alt, member ser begrenset).
- Appen har 6 fargetemaer definert med CSS variables i `index.css`.
- PWA-støtte er aktivert via `vite-plugin-pwa`.
- Alle UI-tekster er på norsk.
