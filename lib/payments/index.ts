import { stripeProvider } from "./stripe";
import { wireProvider } from "./wire";
import type { PaymentProvider, ProviderId } from "./types";

export type * from "./types";

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  wire: wireProvider,
};

export function getProvider(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

/** Only providers that are actually configured are offered at checkout. */
export function availableProviders(): PaymentProvider[] {
  return Object.values(PROVIDERS).filter((p) => p.isConfigured());
}

export function isProviderId(value: string): value is ProviderId {
  return value in PROVIDERS;
}
