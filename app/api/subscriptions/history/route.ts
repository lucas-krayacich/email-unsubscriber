export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, session.userId),
        ne(subscriptions.decision, "pending")
      )
    )
    .orderBy(desc(subscriptions.updatedAt));

  return NextResponse.json(rows);
}
