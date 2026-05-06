import { NextResponse } from "next/server";
import { withAuth } from "@/utils/authServer";
import { getStripeClient } from "@/utils/stripeClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    const priceId = process.env.FIAPP_STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.userId },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/practices`,
    });

    return NextResponse.json({ url: session.url });
  });
}
