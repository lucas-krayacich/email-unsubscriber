export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { executeUnsubscribe } from "@/lib/unsubscribe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, decision } = body as { id: string; decision: "keep" | "unsubscribe" };

  if (!id || !["keep", "unsubscribe"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const row = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.userId)))
    .get();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let unsubStatus = row.unsubStatus;

  if (decision === "unsubscribe") {
    const result = await executeUnsubscribe({
      unsubscribeUrl: row.unsubscribeUrl,
      unsubscribeMailto: row.unsubscribeMailto,
      hasOneClick: row.hasOneClick === 1,
    });
    unsubStatus = result.status;
  }

  await db
    .update(subscriptions)
    .set({ decision, unsubStatus, updatedAt: new Date() })
    .where(eq(subscriptions.id, id));

  return NextResponse.json({ ok: true, unsubStatus });
}
