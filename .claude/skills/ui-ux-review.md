# UI/UX Review

> Sjekk visuell kvalitet og brukeropplevelse før levering.
> Aktiver denne når du har bygget ferdig en side, komponent, eller layout
> og vil sikre at den ser profesjonell ut og fungerer godt for brukerne.

---

## Designfilosofi: Apple / Jony Ive

Alt vi bygger skal føles som et Apple-produkt. Denne standarden gjelder hele gjennomgangen:

- **Enkelhet over alt:** Fjern alt som ikke er nødvendig. Hvis et element ikke tjener et klart formål, skal det ikke være der. Perfeksjon er nådd når det ikke er mer å ta bort.
- **Luft og rom:** Generøs whitespace er et designelement, ikke tomrom. La innholdet puste.
- **Subtile detaljer:** Myke skygger, ikke harde kanter. Avrundede hjørner (8-16px). Mikro-animasjoner som føles naturlige, ikke påklistrede.
- **Typografi som arkitektur:** Én fontfamilie, få vekter, tydelig hierarki. Tight letter-spacing på overskrifter. Systemfonter (SF Pro / Inter) for ren lesbarhet.
- **Dempet fargepalett:** Overveiende nøytralt (hvitt, lysegrått, mørkegrått). Aksentfarge brukes sparsomt og kun for å lede oppmerksomhet.
- **Materialfølelse:** Elementer skal føles som de har dybde og vekt. Subtile gradienter og backdrop-blur når det passer.
- **Intensjonell animasjon:** Overganger 150-300ms med ease-out. Ingenting popper inn — alt glir.
- **Dark mode fra start:** Hvis prosjektet støtter dark mode, skal det se like gjennomtenkt ut som light mode. Ikke bare inverter fargene.

---

## Når denne aktiveres

Bruk denne når:
- En ny side eller layout er ferdig bygget
- Bruker ber om "sjekk designet", "ser det bra ut?", "UX-review", eller "Apple-look"
- Før en nettside skal vises til kunder eller lanseres
- Etter større visuelle endringer

Ikke bruk denne for rene logikk-endringer, backend-arbeid, eller bugfiks uten visuelt resultat.

---

## Gjennomgang (følg denne rekkefølgen)

### 1. Ive-testen

Første inntrykk. Se på siden i 3 sekunder og svar:
- Føles dette rent, rolig, og intensjonelt?
- Eller føles det rotete, overfylt, eller generisk?
- Ville dette kunne vært en Apple-produktside?

Hvis svaret er nei — identifiser hva som bryter illusjonen før du går videre.

### 2. Visuelt hierarki

Brukeren skal umiddelbart forstå hva som er viktigst.

- Finnes det én tydelig hovedhandling (CTA) per seksjon?
- Er overskrifter, brødtekst, og støttetekst i tydelig størrelses-hierarki?
- Leder øyet naturlig fra topp til bunn?

Vanlig feil: Alt er like stort og tungt — ingenting stikker seg ut.

### 3. CRAP-prinsippene

**Contrast:** Er viktige elementer tydelig forskjellige fra omgivelsene? Tekst lesbar mot bakgrunn? Knapper forskjellige fra vanlig tekst?

**Repetition:** Brukes samme stil konsekvent? Samme knapp-stil, spacing-mønster, og farger overalt?

**Alignment:** Er elementer på linje? Ingen "nesten-sentrert" eller "nesten-venstrestilt"?

**Proximity:** Er relaterte ting nær hverandre og urelaterte ting tydelig adskilt?

### 4. Anti-slop (unngå AI-generisk design)

AI-generert design har gjenkjennelige mønstre som ødelegger troverdighet. Sjekk for:
- Overdreven bruk av gradienter og farger uten system
- For mange ikoner, badges, og dekorative elementer
- Generiske stockfoto-aktige illustrasjoner
- "Boxy" layout der alt er perfekte rektangler i rutenett
- Overdrevne drop-shadows eller glow-effekter
- For mange fontstørrelser og vekter blandet uten konsistens

Apple-regelen: Hvis du er i tvil, fjern det. Mindre er alltid mer.

### 5. Interaksjon og touch

- Alle klikkbare elementer minimum 44x44px
- Knapper ser klikkbare ut (ikke flat tekst som er en lenke)
- Hover-states på desktop, active states på mobil
- Fokus-synlighet for tastatur-navigasjon
- Ingen "ghost buttons" som viktigste CTA

### 6. Responsivitet

- Ser det bra ut på mobil (375px), tablet (768px), og desktop (1280px)?
- Tekst brytes naturlig (maks ~70 tegn per linje)
- Bilder skalerer uten forvrengning
- Navigasjon fungerer på alle størrelser

### 7. Typografi og lesbarhet

- Brødtekst minimum 16px
- Linjehøyde 1.5-1.75 for brødtekst
- Maks 2-3 fontvekter (regular, medium, bold)
- Kontrast WCAG AA minimum: 4.5:1 for tekst
- Én fontfamilie konsekvent gjennom hele siden

### 8. Whitespace og pust

- Har seksjoner nok mellomrom til å puste?
- Er padding konsekvent (ikke 16px ett sted og 24px et annet uten grunn)?
- Er det nok rom mellom overskrift og brødtekst?
- Føles siden trang eller luftig? (Apple velger alltid luftig)

---

## Rapportering

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 UI/UX REVIEW                                                │
│                                                                 │
│  Side/komponent: [navn]                                         │
│  Ive-test: [Bestått / Ikke bestått — kort grunn]                │
│                                                                 │
│  ✅ Bra:                                                        │
│  • [hva som fungerer godt]                                      │
│                                                                 │
│  ⚠️ Bør forbedres:                                              │
│  • [problem] → [konkret løsning med Tailwind/CSS-verdier]       │
│                                                                 │
│  Helhetsvurdering: [Klar for lansering / Trenger justeringer]   │
└─────────────────────────────────────────────────────────────────┘
```

Regler for rapporten:
- Maks 3-5 forbedringspunkter, prioritert etter visuell påvirkning
- Gi konkrete verdier (f.eks. "øk padding fra p-4 til p-8", ikke "legg til mer spacing")
- Fokuser på det som påvirker brukeropplevelsen mest
- Alltid start med Ive-testen — hvis den ikke bestås, er det punkt #1 å løse
