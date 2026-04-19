import { useCallback, useEffect, useState } from "react";

/**
 * useUserStorage
 * ──────────────
 * Synkroniserer en verdi med localStorage, men prefikset med innlogget
 * bruker-ID slik at preferansene ikke lekker mellom kontoer på samme
 * enhet (gamle keys som `tt-sortBy` ble delt mellom brukere).
 *
 * Intern key = `tt:${userId}:${key}`.
 *
 * userId sendes inn eksplisitt — hooken kaller IKKE useAuth selv. Ellers
 * ville hver (key,defaultValue)-instans satt opp en ny auth-subscription
 * og dobbel profile-fetch: en side som bruker hooken for både sortBy og
 * viewMode + et tema-par ville blåse opp auth-listeners × 4.
 *
 * Engang-migrering: Hvis en gammel uprefikset key finnes på enheten og
 * den nye prefikset key mangler, flyttes verdien over og gamle key
 * slettes. Dette skjer kun første gang en bruker logger inn etter
 * oppgraderingen — senere brukere på samme enhet får tom konto.
 *
 * Før userId er kjent lagrer hooken kun in-memory (ingen localStorage),
 * så vi unngår å skrive til feil namespace.
 */

type Serializable = string | number | boolean | null | object;

/** Hvilke gamle uprefikset keys som skal migreres automatisk. */
const LEGACY_KEY_MAP: Record<string, string> = {
  sortBy: "tt-sortBy",
  viewMode: "tt-viewMode",
  color_theme: "current_color_theme",
  recent_color_themes: "recent_color_themes",
};

function buildStorageKey(userId: string, key: string): string {
  return `tt:${userId}:${key}`;
}

function readFromStorage<T extends Serializable>(fullKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return fallback;
    // Strings serialiseres uten JSON-quotes i gammel kode — støtt begge.
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch {
    return fallback;
  }
}

function writeToStorage(fullKey: string, value: Serializable): void {
  try {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(fullKey, payload);
  } catch {
    // Quota exceeded eller SSR — ignorer
  }
}

function migrateLegacyKey(userId: string, key: string): void {
  const legacyKey = LEGACY_KEY_MAP[key];
  if (!legacyKey) return;
  const newKey = buildStorageKey(userId, key);
  try {
    const legacyVal = localStorage.getItem(legacyKey);
    if (legacyVal === null) return;
    // Bare migrer hvis ny key ikke allerede er satt
    if (localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, legacyVal);
    }
    localStorage.removeItem(legacyKey);
  } catch {
    // ignore
  }
}

export function useUserStorage<T extends Serializable>(
  userId: string | null | undefined,
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Normaliser undefined → null for konsistent dep-sammenligning
  const safeUserId = userId ?? null;

  // Initier fra localStorage hvis bruker er kjent fra start
  const [value, setValue] = useState<T>(() => {
    if (!safeUserId) return defaultValue;
    migrateLegacyKey(safeUserId, key);
    return readFromStorage(buildStorageKey(safeUserId, key), defaultValue);
  });

  // Når userId blir kjent (etter innlogging i samme sesjon), migrer og last
  useEffect(() => {
    if (!safeUserId) return;
    migrateLegacyKey(safeUserId, key);
    const stored = readFromStorage(buildStorageKey(safeUserId, key), defaultValue);
    setValue(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeUserId, key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (safeUserId) {
          writeToStorage(buildStorageKey(safeUserId, key), resolved);
        }
        return resolved;
      });
    },
    [safeUserId, key]
  );

  return [value, update];
}
