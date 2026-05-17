import { NextResponse } from "next/server";
import { getStripeClient } from "@/utils/stripeClient";
import { createDynamoClient } from "@/utils/dynamoClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.FIAPP_STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const client = createDynamoClient();

  // Idempotency: claim this event.id. Stripe may redeliver the same event;
  // a redelivered refund could otherwise downgrade a user who re-purchased
  // between deliveries. To replay manually, delete the STRIPE_EVENT#<id> row.
  const claimed = await client.putItemIfNotExists({
    PK: `STRIPE_EVENT#${event.id}`,
    SK: "META",
    type: event.type,
    createdAt: new Date().toISOString(),
  });
  if (!claimed) {
    console.log(`[webhook] duplicate delivery ignored: ${event.id} (${event.type})`);
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("[webhook] checkout.session.completed missing userId in metadata");
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
      await client.updateItem({
        Key: { PK: `USER#${userId}`, SK: "PROFILE" },
        UpdateExpression: "SET subscriptionStatus = :status",
        ExpressionAttributeValues: { ":status": "PAID" },
      });
      console.log(`[webhook] upgraded user ${userId} to PAID`);
    } catch (err) {
      console.error("[webhook] failed to update DynamoDB:", err);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
