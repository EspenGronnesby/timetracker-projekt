# Audit — Fase 0

> **Formål:** Kartlegge ALT som finnes i appen i dag, og kategorisere hver del som
> Lag 1 (kjerne for alle), Lag 2 (team-medlemskap), Lag 3 (leder-funksjoner), eller Støy.
>
> **Status:** Utkast — venter på godkjenning fra Espen før Fase 2 (rydding) starter.
>
> **Dato:** 2026-04-07

---

## Mental modell — repetisjon

```
LAG 1 — KJERNEN              → alle brukere ser dette automatisk
LAG 2 — TEAM-MEDLEMSKAP      → låses opp når du blir invitert til et prosjekt
LAG 3 — LEDER-FUNKSJONER     → låses opp når du selv inviterer noen
STØY                         → ingen brukere trenger dette akkurat nå (skjules, slettes ikke)
```

---

## Viktig oppdagelse fra audit

**Profilen har allerede feature toggles i databasen.** Følgende felter eksisterer på `profiles`:

| Felt                          | Hva det styrer                                |
| ----------------------------- | --------------------------------------------- |
| `app_mode`                    | `light` eller `pro` — bytter hele dashboardet |
| `show_team_invite`            | Vise inviter-knapp                            |
| `show_project_actions`        | Vise prosjekt-handlinger                      |
| `show_activity_log`           | Vise aktivitetslogg                           |
| `show_cost_calculator`        | Vise kostnadsberegner                         |
| `show_weather_widget`         | Vise værwidget                                |
| `show_weather_notifications`  | Sende værvarsler                              |
| `color_theme`                 | Fargetema                                     |

**Konsekvens:** Vi trenger ikke bygge et nytt feature flag-system i Fase 2. Vi kan bruke det som finnes, og bare legge til 2–3 nye toggles for resten.

---

## Sider (`src/pages/`)

| Fil                  | Hva den gjør                                    | Lag      | Notater                                                  |
| -------------------- | ----------------------------------------------- | -------- | -------------------------------------------------------- |
| `Landing.tsx`        | Offentlig landingsside                          | Lag 1    | Trenger oppdatering: snakke til BÅDE solo og team        |
| `Auth.tsx`           | Login / registrering                            | Lag 1    | Beholdes som er                                          |
| `Index.tsx`          | Dashboard for innlogget bruker                  | Lag 1+3  | Erstattes av PersonalDashboard i Fase 3                  |
| `ProjectDetails.tsx` | Detaljside for ett prosjekt                     | Lag 1    | Forenkles for solo-bruker, beholder mer for leder        |
| `Settings.tsx`       | Innstillinger                                   | Lag 1    | Beholdes — ALLE trenger settings                         |
| `More.tsx`           | Meny til Settings/Admin/Logg ut                 | Lag 1    | Beholdes                                                 |
| `Goals.tsx`          | Daglige mål / notater                           | STØY     | Lazy-loaded, ikke koblet til kjerneverdi. Skjul i Fase 2 |
| `AdminPanel.tsx`     | Admin-panel for brukerstyring                   | Lag 3    | Bare for systemadministrator (deg)                       |
| `JoinProject.tsx`    | Invitasjonsmottak via lenke                     | Lag 2    | Kritisk for team-flyt                                    |
| `NotFound.tsx`       | 404                                             | Lag 1    | Beholdes                                                 |

---

## Komponenter (`src/components/`)

### Brukes på dashboard / forside

| Fil                          | Hva den gjør                                           | Lag    | Notater                                                                |
| ---------------------------- | ------------------------------------------------------ | ------ | ---------------------------------------------------------------------- |
| `AppShell.tsx`               | Layout med header + tabbar                             | Lag 1  | Beholdes                                                               |
| `BottomTabBar.tsx`           | Bunn-navigasjon                                        | Lag 1  | "Notater"-fanen fjernes (peker til Goals = støy)                       |
| `LightDashboard.tsx`         | Forenklet timer-visning                                | Lag 1  | **Utgangspunkt for PersonalDashboard.** Bygges ut, ikke erstattes.     |
| `ActiveTimerBar.tsx`         | Sticky bar når timer går                               | Lag 1  | Beholdes                                                               |
| `ProjectCard.tsx`            | Stor prosjekt-kort med ALT (timer/km/materialer)       | Lag 1+3| Splittes: en enkel for Lag 1, en utvidet for Lag 3                     |
| `ProjectCardSkeleton.tsx`    | Loading-skeleton                                       | Lag 1  | Beholdes                                                               |
| `QuickStartProjectCard.tsx`  | Liste-versjon av prosjektkort                          | Lag 1  | Forenkles                                                              |

### Tidsregistrering — kjerne

| Fil                       | Hva den gjør                          | Lag    | Notater                                                |
| ------------------------- | ------------------------------------- | ------ | ------------------------------------------------------ |
| `ManualTimeDialog.tsx`    | Skjema for manuell tidsregistrering   | Lag 1  | **Utgangspunkt for papirark-modus i Fase 4.** Bygges ut|
| `EditEntryDialog.tsx`     | Rediger en eksisterende tidspost      | Lag 1  | Beholdes                                               |
| `AddProjectDialog.tsx`    | Opprett nytt prosjekt                 | Lag 1  | Forenkles for solo (mindre obligatoriske felt)         |

### Kjøring (km/GPS)

| Fil                          | Hva den gjør                           | Lag         | Notater                                                          |
| ---------------------------- | -------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `DriveDialog.tsx`            | Start/stopp kjøring                    | Lag 3       | Skjules for solo og ansatte først. Synlig for leder.             |
| `RouteMap.tsx`               | Kart-visning av kjørt rute             | Lag 3       | Skjules                                                          |
| `NavigationButton.tsx`       | Naviger til prosjekt-adresse           | Lag 3       | Skjules for solo                                                 |
| `FavoriteAddressManager.tsx` | Administrer favorittadresser           | Lag 3       | Skjules                                                          |
| `FavoriteQuickSelect.tsx`    | Hurtigvalg av favorittadresse          | Lag 3       | Skjules                                                          |

### Materialer

| Fil                          | Hva den gjør                          | Lag    | Notater                                       |
| ---------------------------- | ------------------------------------- | ------ | --------------------------------------------- |
| `AddMaterialDialog.tsx`      | Legg til materiale                    | Lag 3  | Skjules for solo først                        |
| `ProjectCostCalculator.tsx`  | Beregn prosjektkostnader              | Lag 3  | Allerede gated av `show_cost_calculator`      |

### Rapporter

| Fil                          | Hva den gjør                          | Lag    | Notater                                                  |
| ---------------------------- | ------------------------------------- | ------ | -------------------------------------------------------- |
| `GenerateReportDialog.tsx`   | Eksporter PDF/Excel                   | Lag 3  | Hovedsakelig for leder                                   |

### Filter / søk / sortering

| Fil                  | Hva den gjør                       | Lag    | Notater                                                          |
| -------------------- | ---------------------------------- | ------ | ---------------------------------------------------------------- |
| `SearchAndSort.tsx`  | Søk + sortering                    | STØY   | Overflødig for solo med 1–3 prosjekter. Skjul i Fase 2.          |
| `FilterDrawer.tsx`   | Filter-skuff                       | STØY   | Skjul i Fase 2.                                                  |
| `ActivityFilter.tsx` | Filtrer på dag/uke/måned           | Lag 1  | Forenkles til 3 knapper: I dag / Uke / Måned                     |

### Notifikasjoner

| Fil                         | Hva den gjør                      | Lag    | Notater                                       |
| --------------------------- | --------------------------------- | ------ | --------------------------------------------- |
| `NotificationBell.tsx`      | Bjelle med teller                 | Lag 2  | Trengs først når man er i et team             |
| `NotificationCenter.tsx`    | Liste over notifikasjoner         | Lag 2  | Som over                                      |
| `NotificationPanel.tsx`     | Panel-versjon                     | Lag 2  | Som over                                      |
| `TimerNotificationSystem.tsx` | Påminnelser om timere som går   | Lag 1  | Beholdes — nyttig for alle                    |

### Sosialt / "kos"

| Fil                          | Hva den gjør                       | Lag    | Notater                                       |
| ---------------------------- | ---------------------------------- | ------ | --------------------------------------------- |
| `OnlineUsersIndicator.tsx`   | Vis hvem som er pålogget nå        | Lag 3  | Skjules for solo, vises for team              |
| `StreakIndicator.tsx`        | Streaks (X dager på rad)           | STØY   | Skjul i Fase 2                                |
| `WeatherWidget.tsx`          | Værvarsel                          | STØY   | Allerede gated, skjul som default             |

### Tema / utseende

| Fil                  | Hva den gjør          | Lag    | Notater                                       |
| -------------------- | --------------------- | ------ | --------------------------------------------- |
| `ColorWheel.tsx`     | Velg fargetema        | Lag 1  | Beholdes i Settings                           |
| `ThemeToggle.tsx`    | Lys/mørk-bytter       | Lag 1  | Beholdes                                      |

### Status

| Fil                       | Hva den gjør               | Lag    | Notater                                       |
| ------------------------- | -------------------------- | ------ | --------------------------------------------- |
| `OfflineIndicator.tsx`    | Viser når man er offline   | Lag 1  | Beholdes — nyttig for alle                    |

---

## Hooks (`src/hooks/`)

| Fil                       | Lag    | Notater                                                          |
| ------------------------- | ------ | ---------------------------------------------------------------- |
| `useAuth.ts`              | Lag 1  | Kjernen — beholdes. Trenger evt. utvidelse senere.               |
| `useProjects.ts`          | Lag 1  | Kjernen — beholdes. Stor fil, kan splittes senere.               |
| `useUserRole.ts`          | Lag 3  | Bare admin/user. Trenger ikke utvidelse for vår modell.          |
| `useColorTheme.ts`        | Lag 1  | Beholdes                                                         |
| `useFavoriteAddresses.ts` | Lag 3  | Bare relevant ved kjøring                                        |
| `use-mobile.tsx`          | Lag 1  | Beholdes                                                         |
| `use-toast.ts`            | Lag 1  | Beholdes                                                         |

---

## Edge Functions (`supabase/functions/`)

| Funksjon                       | Lag    | Notater                                                  |
| ------------------------------ | ------ | -------------------------------------------------------- |
| `generate-project-invite`      | Lag 3  | For leder                                                |
| `join-project-via-invite`      | Lag 2  | For ansatt som blir invitert                             |
| `generate-project-report`      | Lag 3  | Eksport — for leder                                      |
| `calculate-project-cost`       | Lag 3  | For leder                                                |
| `calculate-driving-distance`   | Lag 3  | Bare relevant hvis km er på                              |
| `daily-summary`                | Lag 1  | Daglig oppsummering — kan være nyttig for alle           |
| `check-weather-forecast`       | STØY   | Skjules sammen med vær-widget                            |
| `admin-get-users`              | Lag 3  | Bare for systemadmin                                     |
| `customer-login`               | STØY?  | Kunde-portal — uavklart om det er en del av visjonen     |
| `customer-get-projects`        | STØY?  | Som over                                                 |

**Spørsmål til Espen:** Er kunde-portalen (`customer-login`, `customer-get-projects`, `customer_users`-tabellen, `customer_projects_view`) noe du fortsatt vil ha? Det er en hel sub-app som ligger der. Hvis ikke, kan vi merke den som STØY og fryse den.

---

## Database-tabeller

### Beholdes (Lag 1)

- `profiles`
- `projects`
- `time_entries`
- `time_entry_pauses`

### Beholdes (Lag 2)

- `project_members`
- `project_invites`
- `notifications`
- `notification_preferences`
- `user_fcm_tokens`

### Beholdes (Lag 3)

- `materials`
- `drive_entries`
- `favorite_addresses`
- `organizations`
- `user_organizations`
- `user_roles`
- `projects_secure_member_view`

### Støy / uavklart

- `goal_lists`, `goal_tasks` (mål-funksjon — Lag 1, men kan skjules som default)
- `user_streaks` (streaks — STØY)
- `weather_notifications` (vær — STØY)
- `customer_users`, `customer_projects_view` (uavklart, se spørsmål over)

---

## Sammendrag — hva som faktisk blir endret

| Endring                                                                       | Hvor                  | Risiko |
| ----------------------------------------------------------------------------- | --------------------- | ------ |
| Skjul `WeatherWidget`, `StreakIndicator`, `FilterDrawer`, `SearchAndSort` som default | Index.tsx             | Lav    |
| Skjul "Notater"-fanen i BottomTabBar                                          | BottomTabBar.tsx      | Lav    |
| Bygg `PersonalDashboard` basert på `LightDashboard`                           | Ny komponent          | Middels|
| Bygg ut `ManualTimeDialog` til papirark-skjema                                | ManualTimeDialog.tsx  | Lav    |
| Ny "Team"-fane som kun vises hvis bruker har medlemmer på sine prosjekter     | BottomTabBar + ny side | Middels|
| Lønn-visning ("Du har tjent X kr denne uken")                                 | Ny komponent          | Middels|

---

## Avklaringer fra Espen (2026-04-07)

### 1. Kunde-portalen → **FJERNES**

`customer-login`, `customer-get-projects`, `customer_users`-tabellen og `customer_projects_view` markeres som STØY og fjernes i Fase 2.

**Konsekvens:**
- Edge functions `customer-login` og `customer-get-projects` slettes
- Tabell `customer_users` droppes (krever migrering, vises til Espen først)
- View `customer_projects_view` droppes
- Eventuelle UI-referanser ryddes opp

### 2. `Goals.tsx` (Notater) → **BEHOLDES SOM TOGGLE**

Funksjonen er for håndverkere som er ute på jobb og trenger å ta notater (materialer, ting å huske, etc.). Det er ikke kjerne, men en gyldig sub-funksjon.

**Konsekvens:**
- Skjules som default
- Ny toggle på profilsiden: "Vis notater" (legges til `profiles`-tabellen som `show_notes` eller lignende)
- "Notater"-fanen i BottomTabBar vises kun når toggle er på
- Funksjonen omdøpes muligens fra "Goals" til "Notater" i koden også

### 3. `AdminPanel.tsx` → **ÆKTE FUNKSJON med 3-NIVÅ HIERARKI**

Skal være en reell funksjon for bedriftskunder. Krever ny rollemodell:

```
OWNER (Espen)        ← absolutt øverste rett, kan overstyre alt, kan slette/fikse
   │
   ▼
ADMIN (bedriftskunde) ← kan administrere sine egne ansatte og prosjekter
   │
   ▼
USER (vanlig bruker)  ← standardrollen
```

**Konsekvens:**
- `user_roles`-tabellen utvides med rolle `owner` (i tillegg til `admin` og `user`)
- `is_admin()`-funksjonen i Supabase suppleres med `is_owner()`
- AdminPanel viser ulike ting basert på rolle: owner ser ALT, admin ser bare sin egen organisasjon
- RLS-policies må oppdateres for å gi owner full tilgang
- Espen får automatisk owner-rolle ved første migrering

### 4. Lønn/timepris → **PÅ PROFILEN, NORSKE REGLER**

Brukeren skriver inn:
- Timelønn brutto (kr/t)
- Skatteprosent (kr/t)

Appen viser:
- Brutto: `timer × timelønn`
- Netto: `brutto × (1 - skatteprosent)`
- Alle beløp i norske kroner (NOK)

**Konsekvens:**
- Nye felter på `profiles`: `hourly_rate_nok` (numeric), `tax_percentage` (numeric, 0-100)
- Nytt UI-element på Settings: "Min lønn" med to input-felter
- Ny komponent på PersonalDashboard: "Lønnskort" som viser brutto/netto for valgt periode
- **Vurdering for senere:** Norske skatteregler er egentlig komplekse (trinnskatt, trygdeavgift, frikort osv.). For nå holder vi det enkelt: brukeren setter sin egen prosent. Senere kan vi tilby en "Beregn anbefalt skatt"-knapp som bruker faktiske trinn.

### 5. `organizations`-tabellen → **USIKKERT — fryses som er**

Vi rører den ikke i Fase 2. Vi tar stilling til den når vi kommer til Fase 6 (Lag 3 / Team-fane), fordi det er der den eventuelt skal brukes til å gruppere ansatte under en bedrift.

---

## Oppdaterte tabell-statuser

| Tabell                  | Ny status                                              |
| ----------------------- | ------------------------------------------------------ |
| `customer_users`        | **SLETTES i Fase 2** (vises SQL til Espen først)       |
| `customer_projects_view`| **SLETTES i Fase 2**                                   |
| `goal_lists`, `goal_tasks` | Beholdes, skjules bak `show_notes`-toggle           |
| `user_streaks`          | STØY — beholdes, skjules                               |
| `weather_notifications` | STØY — beholdes, skjules                               |
| `user_roles`            | **UTVIDES med 'owner'-rolle i Fase 6**                 |
| `organizations`         | Fryses, vurderes i Fase 6                              |
| `profiles`              | **UTVIDES med `hourly_rate_nok`, `tax_percentage`, `show_notes` i Fase 3** |

---

## Neste steg

Fase 0 er nå komplett. Vi går til **Fase 1: Intervjuguide**.
