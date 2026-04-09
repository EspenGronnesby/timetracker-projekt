# Profile: App iOS (Expo / React Native)

> iOS-app bygget med React Native via Expo, lansert på App Store.
> Rendrer ekte native iOS-komponenter - ikke en WebView-wrapper.
> Du skriver React + TypeScript, appen ser ut og føles som en ekte iPhone-app.

---

## Hvorfor Expo / React Native (ikke Capacitor)

- Rendrer **ekte native iOS UI** - scroll, navigasjon, animasjoner er native
- Du bruker fortsatt **React + TypeScript** (ikke Swift)
- Expo håndterer bygging, signering, og submisjon til App Store
- Apple foretrekker apper med native UI over WebView-wrappere
- Stort økosystem med battle-tested biblioteker for iOS

---

## Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Expo SDK 52+ (managed workflow) |
| UI | React Native 0.76+ |
| Språk | TypeScript |
| Navigasjon | Expo Router (file-based, som Next.js) |
| Styling | NativeWind 4+ (Tailwind for React Native) |
| UI-komponenter | React Native Reusables (shadcn/ui-port for RN) |
| State/Data | TanStack Query |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| Forms | React Hook Form + Zod |
| Build | EAS Build (Expo Application Services) |
| Distribution | App Store via TestFlight |
| Version Control | GitHub |

---

## Viktige forskjeller fra web

Du kan React, men React Native har noen forskjeller du MÅ vite:

| Web (React) | React Native |
|---|---|
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` (all tekst MÅ være i Text) |
| `<img>` | `<Image>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<Pressable>` eller `<TouchableOpacity>` |
| `<a href>` | `<Link>` (Expo Router) |
| CSS / Tailwind klasser | NativeWind klasser (subset av Tailwind) |
| `px`, `rem`, `%` | Unitless tall (density-independent pixels) |
| `hover:` | Finnes ikke. Design for tap. |
| `window.location` | Expo Router `router.push()` |

---

## App Store Krav (Apple)

| Krav | Detaljer |
|------|----------|
| Apple Developer Account | $99/år, kreves for App Store |
| Bundle ID | Unik, f.eks. `no.dittfirma.appnavn` |
| EAS Build | Bygger iOS-app i skyen (trenger ikke Mac for bygging) |
| Mac med Xcode | Kun nødvendig for lokal testing på simulator |
| App Icon | 1024x1024 px, ingen transparens, ingen avrundede hjørner |
| Splash Screen | Konfigureres i `app.json` |
| Privacy Policy URL | Påkrevd av Apple |
| App Store Screenshots | Kreves for iPhone 6.7" og 5.5" |

**Fordel med Expo:** Du kan bygge for App Store uten Mac via EAS Build i skyen.

---

## Typisk Mappestruktur

```
├── app/                           # Routes (Expo Router, file-based)
│   ├── _layout.tsx                # Root layout
│   ├── index.tsx                  # Startskjerm
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/                    # Tab-navigasjon
│       ├── _layout.tsx            # Tab-konfigurering
│       ├── home.tsx
│       ├── profile.tsx
│       └── settings.tsx
│
├── components/                    # Gjenbrukbare komponenter
│   ├── ui/                        # Base UI-komponenter
│   └── [feature]/                 # Feature-spesifikke
│
├── lib/
│   ├── supabase.ts                # Supabase client
│   └── utils.ts
│
├── hooks/                         # Custom hooks
├── types/                         # TypeScript types
├── assets/                        # Bilder, fonter
│
├── app.json                       # Expo konfigurasjon
├── eas.json                       # EAS Build konfigurasjon
├── tailwind.config.js             # NativeWind/Tailwind config
├── package.json
└── tsconfig.json
```

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**VIKTIG:** I Expo brukes `EXPO_PUBLIC_` prefix (ikke `VITE_`). Disse er offentlige.
Hemmeligheter legges i EAS Secrets, ikke i kode.

---

## Development Workflow

```
  npx expo start               ← Starter dev server
     │
     ├── Trykk 'i'              ← Åpner iOS Simulator
     ├── Scan QR-kode            ← Tester på fysisk enhet via Expo Go
     │
  Skriv kode → auto-refresh     ← Hot reload på enhet/simulator
     │
     ▼
  eas build --platform ios      ← Bygger produksjons-app i skyen
     │
     ▼
  eas submit --platform ios     ← Sender til App Store / TestFlight
```

---

## Expo-spesifikke Regler

- **Managed workflow:** Ikke eject. Bruk Expo-plugins og config plugins.
- **app.json:** All app-konfigurasjon (navn, ikon, splash, permissions) her.
- **EAS Build:** Alltid bygg via EAS for produksjon, ikke lokalt.
- **Expo Router:** Bruk file-based routing, som Next.js App Router.
- **expo-updates:** For OTA-oppdateringer uten App Store review (minor fixes).

---

## Navigasjonsmønstre (iOS-standard)

Bruk disse mønstrene for ekte iOS-følelse:

| Mønster | Komponent | Når |
|---------|-----------|-----|
| Tabs | `<Tabs>` (Expo Router) | Hovednavigasjon (2-5 tabs) |
| Stack | `<Stack>` (Expo Router) | Drill-down fra liste til detalj |
| Modal | `presentation: 'modal'` | Skjemaer, bekreftelser |
| Sheet | Bottom sheet bibliotek | Filtre, handlinger |

---

## iOS Design-regler

- **Safe areas:** Alltid bruk `<SafeAreaView>` eller `useSafeAreaInsets()`
- **Touch targets:** Minimum 44x44 pt for alle trykk-elementer
- **Haptics:** Bruk `expo-haptics` for feedback ved viktige handlinger
- **Systemfonter:** Bruk systemfonter for iOS-native følelse
- **Dark mode:** Støtt fra start med `useColorScheme()`
- **Pull to refresh:** Bruk `<FlatList refreshControl>` på lister
- **Swipe back:** Fungerer automatisk med Stack-navigasjon
- **Status bar:** Konfigurer med `expo-status-bar`

---

## Godkjente Biblioteker

| Behov | Bruk | Ikke bruk |
|-------|------|-----------|
| Navigasjon | Expo Router | React Navigation direkte |
| Styling | NativeWind | StyleSheet.create (ok som fallback) |
| Lister | FlatList / FlashList | ScrollView med map() |
| Bilder | expo-image | React Native Image |
| Ikoner | expo-vector-icons | Andre ikon-pakker |
| Animasjoner | react-native-reanimated | Animated API direkte |
| Gestures | react-native-gesture-handler | PanResponder |
| Bottom sheet | @gorhom/bottom-sheet | Egne løsninger |
| Storage (lokal) | expo-secure-store | AsyncStorage for sensitiv data |
| Kamera | expo-camera | - |
| Push | expo-notifications | - |
| Haptics | expo-haptics | - |

---

## Supabase-tilgang

**Modus B: Egen Supabase-konto med MCP.**
- Claude Code kan kjøre SQL direkte via Supabase MCP
- Destruktive queries (DROP, TRUNCATE, DELETE uten WHERE) krever godkjenning
- Ved Prompt 1: velg MODUS B i CLAUDE.md sin "Supabase Database Changes"-seksjon
- Sett opp MCP: `claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest`

## Verification (tillegg til standard)

I tillegg til `npm run build` + `lint` + `tsc`:

```
EKSTRA STEG FOR iOS:
1. npx expo export                ← Sjekk at appen bundler riktig
2. Test på iOS Simulator           ← Sjekk layout og navigasjon
3. eas build --platform ios       ← Sjekk at produksjons-build fungerer
```

---

## NOT DOING i denne profilen

- ❌ Android-støtte i v1 (kan legges til senere, Expo støtter det)
- ❌ Capacitor / WebView-wrapping
- ❌ Swift / SwiftUI direkte
- ❌ Flutter / Dart
- ❌ Bare React Native uten Expo
- ❌ In-app purchases i v1 (legg til med RevenueCat når klar)
- ❌ Offline-first (kan vurderes i v2)
- ❌ Widget / Apple Watch
- ❌ Kodedeling med web-prosjekter (UI er forskjellig, backend-logikk kan deles)
