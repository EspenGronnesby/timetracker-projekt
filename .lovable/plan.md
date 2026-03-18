

## Plan: Fix build error + Make landing page accessible

### 1. Fix TypeScript build error in useProjects.ts
**Problem:** Line 307 — `route_data: routeData ?? null` fails because `Record<string, unknown>` isn't assignable to `Json`.

**Fix:** Cast `routeData` to the correct type:
```ts
route_data: routeData ? JSON.parse(JSON.stringify(routeData)) : null,
```
This ensures the value is a plain JSON-compatible object. Apply same fix if it appears elsewhere in the file (around line 315+).

### 2. Make Landing page reachable from preview
**Problem:** Landing page is at `/` but authenticated users may be redirected, making it hard to edit.

**Fix:** Add a dedicated `/landing` route in `App.tsx` so you can always navigate to it directly:
```tsx
<Route path="/landing" element={<Landing />} />
```
This keeps the existing `/` route intact while giving a direct path for editing.

