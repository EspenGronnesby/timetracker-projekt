# Profile: Web Next.js

> Nettside bygget direkte med Claude Code, deployet til Vercel.
> Full kontroll over kode, SSR/SSG, og API routes.

---

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15+ (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Router | Next.js file-based routing (App Router) |
| State | TanStack Query (for client), Server Components (for server) |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| Hosting | Vercel |
| Version Control | GitHub |

## Typisk Mappestruktur

```
app/
├── layout.tsx           # Root layout
├── page.tsx             # Landing page (/)
├── globals.css          # Tailwind imports
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/
│   ├── layout.tsx       # Dashboard layout (krever auth)
│   └── page.tsx
└── api/                 # API routes (kun hvis Edge Functions ikke passer)

components/
├── ui/                  # shadcn/ui
├── [feature]/           # Feature-spesifikke komponenter

lib/
├── supabase/
│   ├── client.ts        # Browser client
│   ├── server.ts        # Server client (for Server Components)
│   └── middleware.ts     # Auth middleware
├── utils.ts
└── types.ts
```

## Environment Variables

```
# Offentlig (eksponert til browser)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Privat (kun server-side)
SUPABASE_SERVICE_ROLE_KEY=...    # ALDRI i frontend-kode
```

**VIKTIG:** `NEXT_PUBLIC_*` = offentlig. Alt annet = kun server.

## Supabase-tilgang

**Modus B: Egen Supabase-konto med MCP.**
- Claude Code kan kjøre SQL direkte via Supabase MCP
- Destruktive queries (DROP, TRUNCATE, DELETE uten WHERE) krever godkjenning
- Ved Prompt 1: velg MODUS B i CLAUDE.md sin "Supabase Database Changes"-seksjon
- Sett opp MCP: `claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest`

## Next.js-spesifikke Regler

- **Foretrekk Server Components** der det er mulig (standard i App Router).
- **Bruk `'use client'`** kun når komponenten trenger interaktivitet.
- **Supabase har to klienter:** browser (`client.ts`) og server (`server.ts`).
- **Middleware** håndterer auth-sjekk og redirect.
- **Metadata API** for SEO (ikke react-helmet).
- **Image component** (`next/image`) for alle bilder.
- **Link component** (`next/link`) for all intern navigasjon.

## Vercel-spesifikke Regler

- **Vercel deployer automatisk** ved push til main.
- **Preview deployments** for alle PRs.
- **Environment variables** settes i Vercel Dashboard.
- **Edge Functions** kan kjøres via Vercel Edge eller Supabase Edge.

## Typiske Routes

| Route | Type | Formål |
|-------|------|--------|
| `/` | SSG | Landing page (SEO) |
| `/login` | Client | Login |
| `/register` | Client | Registrering |
| `/dashboard` | Client (protected) | Bruker-dashboard |
| `/api/webhook` | API route | Webhooks (Stripe, etc.) |

## Typiske Tabeller

| Tabell | Formål |
|--------|--------|
| `profiles` | Brukerprofiler |
| `contacts` | Kontaktskjema |
| `services` | Tjenester/produkter |

## NOT DOING i denne profilen

- ❌ Pages Router (bruker kun App Router)
- ❌ getServerSideProps/getStaticProps (App Router bruker Server Components)
- ❌ Custom Express/Fastify server
- ❌ Redux (TanStack Query + Server Components)
