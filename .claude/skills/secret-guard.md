# Secret Guard

> Beskytt hemmeligheter fra å lekke i terminal, git, logger, eller Claudes kontekst.
> Denne skillen er ALLTID aktiv. Den trenger ikke aktiveres manuelt.
> Den gjelder for alle filer, kommandoer, og output i alle prosjekter.

---

## Kjerneprinsipp

Hemmeligheter skal ALDRI vises i:
- Terminal-output (cat, echo, grep, head, tail, less, more av .env-filer)
- Claudes input/output-kontekst (samtalen)
- Git commits, diffs, eller PR-beskrivelser
- Feilmeldinger eller logger
- Kommentarer i kode

---

## Hva er en hemmelighet?

### Alltid hemmelig (vis ALDRI)

- API-nøkler (Supabase service_role, Stripe secret, Resend)
- Databasepassord og connection strings
- JWT secrets og auth tokens
- Private keys (SSH, SSL, signing)
- Webhook secrets
- Alle strenger som starter med `sk_`, `secret_`, `key_`, `ghp_`, `re_`

### Offentlig by design (trygt å vise)

- `VITE_*` variabler — designet for frontend (Lovable)
- `NEXT_PUBLIC_*` variabler — designet for browser (Next.js)
- `EXPO_PUBLIC_*` variabler — designet for app (Expo)
- Supabase URL og anon key — begrenset av RLS
- Bundle IDs, app-navn, domener

### Gråsone (spør bruker først)

- E-postadresser i config
- Port-nummer og interne URLer
- Test-credentials

---

## Regler

### 1. Les aldri .env direkte

```
❌ ALDRI:
   cat .env
   echo $SUPABASE_SERVICE_ROLE_KEY
   grep -r "sk_live" .
   head .env
   git diff (når .env er endret)
   git log -p (kan vise historiske secrets)

✅ ISTEDENFOR:
   cat .env.example
   "Legg til STRIPE_SECRET_KEY i .env-filen din"
   "Har du satt RESEND_API_KEY? (ikke vis den til meg)"
```

For å sjekke OM en variabel er satt (uten å se verdien):
```bash
# Sjekk at variabel finnes (viser kun "set" eller "not set")
node -e "console.log(process.env.STRIPE_SECRET_KEY ? 'set' : 'not set')"
```

### 2. Referer til variabler, aldri verdier

- Bruk variabelnavnet: `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Bruk placeholder: `sk_live_...` eller `[DIN_NØKKEL]`
- Aldri kopier en verdi inn i kode, selv midlertidig

### 3. Hold .env.example oppdatert

Når en ny environment variable legges til:
1. Legg til variabelnavnet (uten verdi) i `.env.example`
2. Legg til kommentar som forklarer formålet
3. Oppdater CLAUDE.md sin Environment Variables-seksjon

Format:
```
# Supabase (påkrevd)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase admin (kun server-side, ALDRI i frontend)
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (betaling)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# E-post
RESEND_API_KEY=
```

### 4. Git-beskyttelse

Før HVER commit, verifiser:

```bash
# Sjekk at .env IKKE er tracket
git ls-files --error-unmatch .env 2>/dev/null && echo "🔴 FARE: .env er i git!" || echo "✅ OK"
```

Sjekkliste:
- `.env`, `.env.local`, `.env.production` er i `.gitignore`
- Ingen hardkodede nøkler i staged files
- Ingen secrets i commit-meldinger

### 5. Feilmeldinger

Når en feil inneholder en hemmelighet:
- Vis feilmeldingen med hemmeligheten erstattet av `[REDACTED]`
- Forklar feilen uten å avsløre verdien
- Eksempel: `Connection failed: postgresql://user:[REDACTED]@host:5432/db`

---

## Mønster-gjenkjenning

Stopp og advar hvis du ser disse i kode eller output:

| Mønster | Risiko |
|---------|--------|
| `sk_live_`, `sk_test_` | Stripe-nøkkel |
| `eyJ` + lang base64 | Hardkodet JWT token |
| `supabase.co` + lang streng | Supabase service key |
| `re_` + lang streng | Resend API-nøkkel |
| `ghp_`, `github_pat_` | GitHub token |
| `postgresql://` med passord | Database connection string |
| `-----BEGIN PRIVATE KEY` | Privat nøkkel |
| `whsec_` | Stripe webhook secret |

---

## Supabase-spesifikk sikkerhet

| Nøkkel | Frontend OK? | Forklaring |
|--------|-------------|------------|
| `anon` key | ✅ Ja | Begrenset av RLS policies |
| `service_role` key | ❌ ALDRI | Full tilgang, bypass RLS |

- `service_role` skal KUN brukes i Edge Functions eller server-side kode
- Hvis `service_role` dukker opp i frontend-kode → 🔴 STOPP umiddelbart

---

## Lekkasje-alarm

Hvis en hemmelighet oppdages i kode, output, eller staged files:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 SECRET GUARD — LEKKASJE OPPDAGET                            │
│                                                                 │
│  Fil: [filnavn]                                                 │
│  Type: [API-nøkkel / passord / token]                           │
│  Mønster: [hva som ble funnet, f.eks. "sk_live_*"]              │
│                                                                 │
│  STOPP. Ikke commit dette.                                      │
│  Fjern hemmeligheten og bruk environment variable istedenfor.   │
└─────────────────────────────────────────────────────────────────┘
```

## Hvis en nøkkel HAR lekket (allerede committed)

Dette er en nødsituasjon. Følg disse stegene:

1. **Roter nøkkelen umiddelbart** — generer ny nøkkel i tjenestens dashboard
2. **Oppdater .env** med den nye nøkkelen
3. **Fjern fra git-historikk** er vanskelig — det enkleste er å anse den gamle nøkkelen som kompromittert og bare bruke den nye
4. **Sjekk tilgangslogger** i tjenestens dashboard for uautorisert bruk
5. **Dokumenter i lessons.md** hva som skjedde og hvordan det unngås

Aldri anta at "ingen har sett den" — om den har vært i git, behandle den som lekket.
