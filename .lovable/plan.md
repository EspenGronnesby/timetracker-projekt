

## Plan: Null-klikk pause + Visuell modus-toggle

### Endring 1: Fjern pause-popup, legg til to direkte knapper

**Fil:** `src/pages/SimpleTimer.tsx`

**Nå:** Én Pause-knapp → åpner AlertDialog med 3 valg (lunsj ubetalt, lunsj betalt, kort pause).

**Nytt:** Fjern AlertDialog helt. Når timeren kjører, vis to knapper ved siden av STOPP:
- ☕ **Pause** — starter `short_break`, betalt/ubetalt styres av innstillinger
- 🍽️ **Lunsj** — starter lunsj, betalt/ubetalt basert på `wageSettings.lunch_is_paid`

Ett trykk starter pausen. Når pause er aktiv, ett trykk på den grønne PLAY-knappen avslutter den. Ingen popup, ingen valg i øyeblikket.

Knappelayout når timer kjører:
```text
  [☕ Pause]   [⏹ STOPP (120px)]   [🍽️ Lunsj]
```

**Teknisk:** Hent `wageSettings` via `useWageSettings()` i SimpleTimer for å bestemme `isPaid` automatisk. Fjern `showBreakDialog` state, fjern AlertDialog import.

---

### Endring 2: Visuell slide-switch + bekreftelsesdialog + onboarding

**Fil:** `src/pages/Settings.tsx`

Erstatt de to grid-knappene med en visuell slide-switch:

```text
┌─────────────────────────────────┐
│  [ Enkel advancement Pro ]  │  ← slide-switch
│   ●━━━━━━━━○                │  ← visuelt indikerer aktiv side
└─────────────────────────────────┘
```

Implementeres som en styled toggle med to labels ("Enkel" / "Pro") og en glidende indikator-pille bak aktiv valg. Bruk CSS transitions for smooth slide.

**Bekreftelsesdialog:** Når bruker klikker for å bytte modus, vis en `AlertDialog`:
- Tittel: "Bytte til [Pro/Enkel]-modus?"
- Beskrivelse av hva som endres
- "Ingen data går tapt"
- Bekreft / Avbryt knapper

**Onboarding-modal for nye brukere:** Sjekk om `profile.app_mode` er null/undefined (første gang). Hvis ja, vis en velkomst-dialog med kort forklaring av begge moduser og la brukeren velge. Lagre valget til profilen.

**Fil:** `src/hooks/useAppMode.ts` — Fjern `window.location.href` reload og bruk `useNavigate` + query invalidation for smidigere bytte.

### Filer som endres
1. `src/pages/SimpleTimer.tsx` — fjern popup, legg til ☕/🍽️ knapper
2. `src/pages/Settings.tsx` — slide-switch, bekreftelsesdialog, onboarding
3. `src/hooks/useAppMode.ts` — fjern hard reload, bruk navigate

