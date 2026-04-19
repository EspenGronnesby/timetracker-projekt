import { supabase } from "@/integrations/supabase/client";
import type { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError } from "@supabase/supabase-js";

/**
 * Wrapper rundt supabase.functions.invoke som gir retry-støtte med
 * exponential backoff. Kun GET-lignende / idempotente funksjoner bør
 * retry'es automatisk — for alt som endrer state (opprette invites,
 * endre kvitteringer) må kalleren være trygg på at dobbel-eksekvering
 * er OK, ellers settes idempotent=false.
 *
 * Retry utløses bare på:
 *   - nettverksfeil (ingen HTTP-status)
 *   - HTTP 5xx (serverfeil — sannsynligvis transient)
 *
 * 4xx-feil (input/auth) retry'es aldri, fordi de ikke blir bedre av
 * å prøve igjen.
 */

type SupabaseFunctionsError = FunctionsHttpError | FunctionsFetchError | FunctionsRelayError | Error;

export interface InvokeWithRetryOptions {
  /** Antall forsøk totalt (inkl. førsteforsøket). Default 3. */
  retries?: number;
  /** Første delay i ms før retry 1. Dobles for hver retry. Default 300. */
  backoffMs?: number;
  /** Er funksjonen trygg å retry'e? Default false. */
  idempotent?: boolean;
}

export interface InvokeResult<T> {
  data: T | null;
  error: SupabaseFunctionsError | null;
}

function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  // Supabase v2 wrapper har context.response med status
  const ctx = (err as { context?: { response?: { status?: number } } })?.context;
  const status = ctx?.response?.status;
  if (status !== undefined) {
    return status >= 500 && status < 600;
  }
  // Ingen status → tolkes som nettverksfeil
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kaller en Supabase edge function og retry'er på transient feil hvis
 * den er markert som idempotent.
 */
export async function invokeWithRetry<T = unknown>(
  functionName: string,
  options: Parameters<typeof supabase.functions.invoke>[1] = {},
  retryOptions: InvokeWithRetryOptions = {}
): Promise<InvokeResult<T>> {
  const { retries = 3, backoffMs = 300, idempotent = false } = retryOptions;
  const maxAttempts = idempotent ? retries : 1;

  let lastError: SupabaseFunctionsError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase.functions.invoke(functionName, options);

    if (!error) {
      return { data: data as T, error: null };
    }

    lastError = error as SupabaseFunctionsError;

    // Siste forsøk — gi opp
    if (attempt === maxAttempts) break;
    // 4xx eller annen ikke-retryable feil — gi opp
    if (!isRetryableError(error)) break;

    // Exponential backoff: 300ms, 900ms, 2700ms, ...
    await sleep(backoffMs * Math.pow(3, attempt - 1));
  }

  return { data: null, error: lastError };
}
