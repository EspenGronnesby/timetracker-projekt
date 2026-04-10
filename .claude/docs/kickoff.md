# Kickoff

> **Formål:** Planlegg prosjektet FØR du skriver kode.
> **Regel:** Claude skal fylle ut denne filen og få godkjenning fra bruker før koding starter.
> **Når:** Ved oppstart av nytt prosjekt (etter Prompt 1: Initialize).

---

## Prosjekt

**Navn:** Timetracker
**Profil:** web-lovable (se `.claude/profiles/web-lovable.md`)
**Repo:** https://github.com/EspenGronnesby/timetracker-projekt (privat)
**Domene:** Lovable Cloud hosting

---

## Hva bygger vi?

> En tidsregistrerings-app for norske håndverkere og entreprenører som gjør det enkelt å spore arbeidstid, kjøring og materialer per prosjekt. Designet for småbedrifter med mange små oppdrag (15-30+ prosjekter).

---

## Målgruppe

> Norske håndverkere, elektrikere, rørleggere og entreprenører som trenger enkel timeregistrering i felt. Brukerne er ofte på farten, bruker mobil, og vil ha minst mulig stress med administrasjon.

---

## Brukerreiser (topp 3)

1. **Tidsregistrering:** Bruker åpner appen → trykker Play på et prosjekt → timer starter → trykker Pause → tid lagres automatisk med varighet
2. **Kjøreregistrering:** Bruker trykker bil-ikon → GPS registrerer startposisjon → kjører til destinasjon → trykker stopp → km beregnes automatisk via GPS → lagres
3. **Materialregistrering:** Bruker trykker material-ikon → fyller inn navn, antall, pris → total beregnes → lagres på prosjektet

---

## Sider / Routes (v1)

| Route | Formål | Offentlig? |
|-------|--------|------------|
| `/` | Landing page (norsk) | Ja |
| `/app` | Dashboard med alle prosjekter | Nei (auth) |
| `/auth` | Login/registrering | Ja |
| `/project/:id` | Prosjektdetaljer | Nei (auth) |
| `/goals` | Daglige mål | Nei (auth) |
| `/settings` | Brukerinnstillinger | Nei (auth) |
| `/admin` | Admin-panel | Nei (admin) |
| `/join/:inviteCode` | Prosjektinvitasjon | Ja (delvis) |

---

## Datamodell (v1)

| Tabell | Formål | Viktigste kolonner |
|--------|--------|--------------------|
| `profiles` | Brukerprofiler | id, name, organization_*, show_* flags, color_theme |
| `projects` | Prosjekter | id, name, color, customer_*, completed, hide_customer_info |
| `project_members` | Teammedlemskap | user_id, project_id, role (owner/member) |
| `time_entries` | Tidsregistreringer | project_id, user_id, start_time, end_time, duration_seconds, comment |
| `drive_entries` | Kjøreregistreringer | project_id, user_id, start/end_time, kilometers, start/end_location, route_data |
| `materials` | Materialkostnader | project_id, user_id, name, quantity, unit_price, total_price |
| `favorite_addresses` | Favorittadresser | user_id, name, address, category |
| `goal_lists` / `goal_tasks` | Mål | user_id, name, is_completed, deadline, points |
| `organizations` | Organisasjoner | organization_name, organization_number |
| `notifications` | Notifikasjoner | user_id, title, message, type, read |
| `user_roles` | Roller | user_id, role (admin/user) |
| `user_streaks` | Streak-sporing | user_id, current_streak, longest_streak |

---

## Integrasjoner

| Tjeneste | Formål | Prioritet |
|----------|--------|-----------|
| Supabase Auth | Login/registrering | Må ha |
| Supabase Edge Functions | Distanseberegning, rapporter, invitasjoner | Må ha |
| Supabase Realtime | Live-oppdateringer | Har |
| Browser Geolocation API | GPS for kjøreregistrering | Må ha |
| Google Directions API (via edge fn) | Ruteberegning mellom GPS-koordinater | Har |
| jsPDF / xlsx | PDF/Excel-eksport av rapporter | Har |
| vite-plugin-pwa | Offline-støtte (PWA) | Har |

---

## Definition of Done (v1)

Hva MÅ fungere for at v1 er ferdig:

- [x] Bruker kan registrere seg og logge inn
- [x] Bruker kan opprette prosjekter med kundeinformasjon
- [x] Bruker kan starte/stoppe timer per prosjekt (1-klikk)
- [x] Bruker kan registrere kjøring med automatisk GPS og km-beregning
- [x] Bruker kan legge til materialer med pris
- [x] Bruker kan invitere andre til prosjekter
- [x] Prosjektdetaljer viser all aktivitet
- [x] Søk og sortering av prosjekter
- [x] Grid- og listevisning
- [x] 6 fargetemaer
- [x] PWA-støtte
- [x] Norsk UI

---

## NOT DOING (v1)

Ting vi bevisst IKKE bygger i v1:

- ❌ Fakturering / betalingsløsning
- ❌ Offline-modus med full sync (kun PWA shell)
- ❌ Avansert rapportering med grafer over tid
- ❌ Integrasjon med regnskapssystemer
- ❌ Kundeportal (delvis påbegynt, ikke prioritert)
- ❌ Push-notifikasjoner (infrastruktur finnes, ikke aktivert)

> Disse kan vurderes i v2. Scope guard håndhever dette.

---

## Godkjenning

Prosjektet er allerede i produksjon. Kickoff er fylt ut retroaktivt basert på eksisterende funksjonalitet.
