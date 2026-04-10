# Profile: Web Lovable

> Nettside bygget visuelt i Lovable, med Supabase backend.
> Kode vedlikeholdes i VS Code / Claude Code etter initial bygging.

---

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Lovable Cloud, Vite, React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Router | react-router-dom |
| State | TanStack Query |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| Hosting | Lovable Cloud |
| Version Control | GitHub |

## Typisk Mappestruktur

```
src/
├── components/
│   └── ui/              # shadcn/ui (ikke rediger manuelt)
├── pages/               # En fil per route
├── hooks/               # Custom hooks
├── lib/                 # Utils, supabase client
├── types/               # TypeScript types
└── integrations/
    └── supabase/        # Auto-generert (types.ts - ikke rediger)
```

## Environment Variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Alle frontend-variabler starter med `VITE_`. Disse er offentlige by design.

## Supabase-tilgang

**Modus A: Lovable styrer Supabase.**
- Claude Code har IKKE direkte tilgang til databasen
- SQL skrives i kodeblokk og bruker kopierer til Supabase SQL Editor
- Ved Prompt 1: velg MODUS A i CLAUDE.md sin "Supabase Database Changes"-seksjon

## Lovable-spesifikke Regler

- **Lovable genererer kode.** Ikke endre `src/integrations/supabase/types.ts` manuelt.
- **Lovable syncer med GitHub.** Push/pull fungerer begge veier.
- **Supabase-endringer** gjøres i Supabase Dashboard, ikke i kode.
- **shadcn/ui komponenter** i `src/components/ui/` administreres av Lovable.

## Typiske Routes

| Route | Formål |
|-------|--------|
| `/` | Landing page (offentlig, SEO-optimert) |
| `/auth` | Login/registrering |
| `/dashboard` | Bruker-dashboard (krever auth) |
| `/om-oss` | Statisk side |
| `/kontakt` | Kontaktskjema |
| `/tjenester` | Tjenesteoversikt |

## Typiske Tabeller

| Tabell | Formål |
|--------|--------|
| `profiles` | Brukerprofiler (auto-opprettet ved registrering) |
| `contacts` | Kontaktskjema-innmeldinger |
| `services` | Tjenester/produkter |

## NOT DOING i denne profilen

- ❌ SSR/SSG (Lovable er SPA)
- ❌ API routes (bruk Supabase Edge Functions)
- ❌ Custom server (alt er client-side + Supabase)
- ❌ ISR/Incremental Static Regeneration
