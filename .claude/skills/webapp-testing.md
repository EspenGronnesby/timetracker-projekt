# Webapp Testing

Skill for å teste brukerreiser, skjemaer, auth-flyter og responsivitet i webapper.
Bruker Playwright via Claude Code for å automatisere og verifisere at appen fungerer som forventet.

---

## Når aktiveres denne skillen?

- Bruker sier "test appen", "sjekk at det fungerer", "kjør en brukertest"
- Etter ferdig feature som involverer brukerinteraksjon
- Ved kickoff: planlegg hvilke brukerreiser som skal testes
- Ved "verify" når visuell/funksjonell sjekk trengs (utover build/lint/tsc)

---

## Kjerneprinsipp

> Test det brukeren faktisk gjør, ikke det koden teknisk inneholder.

En bruker bryr seg ikke om komponentstruktur. De bryr seg om:
- "Kan jeg registrere meg?"
- "Kan jeg logge inn?"
- "Kan jeg gjøre det jeg kom for?"
- "Ser det riktig ut på mobilen min?"

---

## Arbeidsmodus

### Steg 1: Sjekk forutsetninger

```
Er dev server oppe?
├─ Ja → Fortsett
└─ Nei → Start med: npm run dev
         Vent til serveren svarer på http://localhost:5173 (eller konfigurert port)
```

### Steg 2: Velg testtype

```
Hva skal testes?
├─ Brukerreise      → Steg 3a
├─ Skjema           → Steg 3b
├─ Auth-flyt        → Steg 3c
├─ Responsivitet    → Steg 3d
└─ Alt / smoke test → Kjør 3a-3d i rekkefølge
```

### Steg 3a: Brukerreise-test

Test de viktigste brukerreisene fra kickoff.md.

```
For hver brukerreise:
1. Start på landingssiden
2. Naviger som en ekte bruker (klikk, ikke goto)
3. Verifiser at hvert steg viser riktig innhold
4. Verifiser at sluttresultatet er korrekt
5. Ta screenshot ved hvert viktig steg
```

**Playwright-mønster:**
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    # Naviger som bruker
    page.click('text=Kom i gang')
    page.wait_for_url('**/register')

    # Verifiser innhold
    assert page.locator('h1').text_content() == 'Registrer deg'

    # Screenshot
    page.screenshot(path='/tmp/test-register.png')
    browser.close()
```

### Steg 3b: Skjema-test

```
For hvert skjema:
1. Test happy path (alle felt riktig utfylt)
2. Test tomme required-felt → forvent feilmelding
3. Test ugyldig input (feil e-postformat, for kort passord)
4. Test XSS-forsøk: <script>alert('xss')</script> i tekstfelt
5. Test submit-knapp disabled under sending
6. Verifiser success-tilstand (toast, redirect, melding)
```

**Viktige sjekker:**
- Submit-knappen skal være disabled med tomme required-felt
- Feilmeldinger skal vises ved/under det relevante feltet
- Etter vellykket submit: bruker ser bekreftelse ELLER redirect

### Steg 3c: Auth-flyt-test

```
Registrering:
1. Gå til /register eller registreringsside
2. Fyll inn gyldig e-post + passord
3. Verifiser at bruker kommer til riktig side etter registrering
4. Test med allerede registrert e-post → forvent feilmelding

Login:
1. Gå til /login eller innloggingsside
2. Fyll inn eksisterende bruker
3. Verifiser redirect til protected area
4. Test med feil passord → forvent feilmelding
5. Test med ikke-eksisterende bruker → forvent feilmelding

Protected routes:
1. Gå direkte til /dashboard (eller protected route) uten innlogging
2. Verifiser redirect til login
3. Logg inn → verifiser at du kommer tilbake til ønsket side

Logout:
1. Mens innlogget, klikk logg ut
2. Verifiser redirect til offentlig side
3. Prøv å gå til protected route → skal redirecte til login
```

### Steg 3d: Responsivitetstest

```
Test tre viewports:
1. Mobil:   375 x 667  (iPhone SE)
2. Tablet:  768 x 1024 (iPad)
3. Desktop: 1440 x 900

For hver viewport:
- Naviger til hovedsidene
- Ta screenshot
- Sjekk at navigasjon er tilgjengelig (hamburger-meny på mobil?)
- Sjekk at tekst ikke overflower
- Sjekk at knapper er klikkbare (ikke overlappet)
- Sjekk at bilder skalerer riktig
```

**Playwright viewport-mønster:**
```python
viewports = [
    {"width": 375, "height": 667, "name": "mobile"},
    {"width": 768, "height": 1024, "name": "tablet"},
    {"width": 1440, "height": 900, "name": "desktop"},
]

for vp in viewports:
    context = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    page = context.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=f'/tmp/test-{vp["name"]}-home.png', full_page=True)
    context.close()
```

---

## Rapportformat

Etter testing, rapporter slik:

```
## 🧪 Testrapport

**Testet:** [dato] | **Profil:** [web-lovable/web-nextjs/app-ios]
**URL:** http://localhost:[port]

### Brukerreiser
| Reise | Status | Notater |
|-------|--------|---------|
| Registrering → Dashboard | ✅ | OK |
| Søk → Resultat → Kontakt | ⚠️ | Søkefelt mangler placeholder |
| Admin login → Redigering | ❌ | 403 på /admin/edit |

### Skjemaer
| Skjema | Happy path | Tomt | Ugyldig | XSS |
|--------|-----------|------|---------|-----|
| Kontaktskjema | ✅ | ✅ | ⚠️ feilmelding mangler | ✅ |
| Registrering | ✅ | ✅ | ✅ | ✅ |

### Auth
| Flyt | Status | Notater |
|------|--------|---------|
| Registrering | ✅ | |
| Login | ✅ | |
| Feil passord | ✅ | Viser feilmelding |
| Protected route | ❌ | Ingen redirect til login |
| Logout | ✅ | |

### Responsivitet
| Side | Mobil | Tablet | Desktop |
|------|-------|--------|---------|
| Forside | ✅ | ✅ | ✅ |
| Dashboard | ⚠️ tabell scroller | ✅ | ✅ |

### Screenshots
Lagret i /tmp/test-*.png

### Oppsummering
- ✅ [antall] bestått
- ⚠️ [antall] warnings (fungerer, men bør forbedres)
- ❌ [antall] feilet (må fikses)
```

---

## Severity-kobling

- ❌ Feilet test → 🔴 CRITICAL (rapporter, vent på bruker)
- ⚠️ Warning → 🟡 WARNING (rapporter, fortsett)
- ✅ Bestått → ingen handling nødvendig

---

## Viktige regler

1. **ALDRI hardkod test-credentials.** Bruk .env.example for testbruker-info, eller opprett testbruker via Supabase dashboard.
2. **Screenshots til /tmp/.** Aldri lagre i prosjektmappen.
3. **Vent alltid på networkidle** før du inspiserer DOM på dynamiske apper.
4. **Test som bruker, ikke som utvikler.** Klikk på synlige elementer, ikke bruk interne selektorer.
5. **Respekter secret-guard.** Aldri vis passord, API-nøkler eller tokens i testrapporter eller screenshots.
6. **Spør før du installerer Playwright.** Hvis det ikke er installert, spør bruker: "Skal jeg installere Playwright for testing? (`pip install playwright && playwright install chromium`)"

---

## Kobling til andre skills

- **kickoff.md** → Brukerreiser som skal testes
- **verify.md** → Webapp-testing er steg 4 (etter build/lint/tsc) når visuell sjekk trengs
- **secret-guard.md** → Aldri eksponer hemmeligheter i testskript eller rapporter
- **ui-ux-review.md** → Screenshots fra responsivitetstest kan brukes som input til UI/UX review
- **scope-guard.md** → Test kun det som er relevant for oppgaven, ikke hele appen
