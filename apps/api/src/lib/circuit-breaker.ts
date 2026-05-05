import CircuitBreaker from "opossum";
import { createLogger } from "./logger";

const log = createLogger({ component: "circuit-breaker" });

const DEFAULT_OPTIONS: CircuitBreaker.Options = {
  timeout: 10_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  volumeThreshold: 5,
};

/**
 * Wraps any async function with an opossum circuit breaker.
 * State changes (open / half-open / close) are logged automatically.
 */
export function createBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
  overrides?: Partial<CircuitBreaker.Options>,
): CircuitBreaker<TArgs, TResult> {
  const breaker = new CircuitBreaker(fn, {
    ...DEFAULT_OPTIONS,
    ...overrides,
    name,
  });

  breaker.on("open", () => {
    log.warn({ breaker: name }, "Circuit breaker OPENED — calls will be short-circuited");
  });

  breaker.on("halfOpen", () => {
    log.info({ breaker: name }, "Circuit breaker HALF-OPEN — next call is a test");
  });

  breaker.on("close", () => {
    log.info({ breaker: name }, "Circuit breaker CLOSED — back to normal");
  });

  return breaker;
}

// ---------------------------------------------------------------------------
// Pre-configured breakers for external services
//
// Each breaker wraps a generic thunk `() => Promise<T>`.  The `fire()` helper
// preserves the return type so callers get proper inference.
// ---------------------------------------------------------------------------

function makeServiceBreaker(name: string, overrides?: Partial<CircuitBreaker.Options>) {
  // The underlying breaker accepts a thunk and invokes it.
  const breaker = createBreaker(
    (fn: () => Promise<unknown>) => fn(),
    name,
    overrides,
  );

  return {
    /** Fire an async thunk through the circuit breaker with full type inference. */
    fire<T>(fn: () => Promise<T>): Promise<T> {
      return breaker.fire(fn) as Promise<T>;
    },
    /** The raw opossum breaker, if you need stats / event listeners. */
    raw: breaker,
  };
}

/** Stripe API calls (checkout, price list, etc.) */
export const stripeBreaker = makeServiceBreaker("stripe", { timeout: 15_000 });

/** Firebase Admin / FCM push sends */
export const firebaseBreaker = makeServiceBreaker("firebase");

/** OpenAI chat completions */
export const openaiBreaker = makeServiceBreaker("openai", { timeout: 30_000 });

/** Email delivery (Resend / SMTP) */
export const emailBreaker = makeServiceBreaker("email", { timeout: 25_000 });
