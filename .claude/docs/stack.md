# Stack & Blacklist

> **Formål:** Definerer godkjent teknologi og hva som IKKE skal brukes.
> **Regel:** Claude skal alltid følge denne listen. Nye dependencies krever godkjenning.

---

## Godkjent Felles Stack

Disse brukes i ALLE prosjekter uansett profil:

| Kategori | Teknologi | Merknad |
|----------|-----------|---------|
| Språk | TypeScript | Alltid strict mode |
| Styling | Tailwind CSS | Ingen custom CSS med mindre nødvendig |
| UI | shadcn/ui (Radix) | Foretrekk disse over egne komponenter |
| Backend | Supabase | Auth, DB, Storage, Edge Functions |
| Forms | React Hook Form + Zod | For all form-validering |
| State/Data | TanStack Query | For server state |
| Version Control | GitHub | Alltid branching workflow |

---

## Profilspesifikk Stack

Se `.claude/profiles/` for detaljer per prosjekttype.

| Profil | Frontend | Hosting | Router |
|--------|----------|---------|--------|
| web-lovable | Lovable Cloud + Vite + React 18 | Lovable | react-router-dom |
| web-nextjs | Next.js 15+ (App Router) | Vercel | Next.js file-based |
| app-ios | Expo SDK 52+ + React Native | App Store | Expo Router (file-based) |

---

## Godkjente Integrasjoner

Bruk disse når integrasjoner trengs:

| Behov | Bruk | Ikke bruk |
|-------|------|-----------|
| Betaling (internasjonal) | Stripe | Egen betalingsløsning |
| Betaling (Norge) | Vipps | - |
| E-post (transaksjonell) | Resend | SendGrid, Mailgun |
| Kontaktskjema | Web3Forms eller Resend | EmailJS |
| Analytics | Plausible | Google Analytics |
| Error tracking | Sentry | Egen logging |
| SEO | Neste: next-seo / Lovable: react-helmet-async | - |

---

## BLACKLIST - Bruk ALDRI

Disse teknologiene skal IKKE brukes:

| Teknologi | Grunn |
|-----------|-------|
| Redux | Overkill. Bruk TanStack Query + React context |
| Axios | Unødvendig. Bruk native fetch eller Supabase client |
| Moment.js | Utdatert. Bruk date-fns hvis dato-logikk trengs |
| styled-components | Bruker Tailwind |
| Material UI | Bruker shadcn/ui |
| Firebase | Bruker Supabase |
| Prisma | Bruker Supabase direkte |
| Express/Fastify | Bruker Supabase Edge Functions |
| jQuery | Nei |
| Lodash (full) | Bruk native JS. Enkelte lodash-funksjoner OK ved behov |

---

## Nye Dependencies

Før du installerer noe som IKKE er på godkjent-listen:

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 NY DEPENDENCY (ikke på godkjent liste)                       │
│                                                                 │
│  Pakke: [navn]                                                  │
│  Grunn: [hvorfor den trengs]                                    │
│  Alternativ: [finnes det en godkjent løsning?]                  │
│  Størrelse: [bundle size hvis relevant]                          │
│                                                                 │
│  Skal jeg legge den til?                                        │
└─────────────────────────────────────────────────────────────────┘
```

**VENT** på brukers godkjenning.
