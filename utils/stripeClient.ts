import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!client) {
    const key = process.env.FIAPP_STRIPE_SECRET_KEY;
    if (!key) throw new Error("FIAPP_STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return client;
}
