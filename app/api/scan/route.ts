export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scanGmail } from "@/lib/gmail";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const senders = await scanGmail(session.accessToken, session.refreshToken);

  let added = 0;
  let updated = 0;

  for (const sender of senders) {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.userId),
          eq(subscriptions.senderAddress, sender.senderAddress)
        )
      )
      .get();

    if (!existing) {
      await db.insert(subscriptions).values({
        userId: session.userId,
        senderName: sender.senderName,
        senderAddress: sender.senderAddress,
        lastSubject: sender.lastSubject,
        lastDate: sender.lastDate,
        emailCount: sender.emailCount,
        unsubscribeUrl: sender.unsubscribeUrl,
        unsubscribeMailto: sender.unsubscribeMailto,
        hasOneClick: sender.hasOneClick ? 1 : 0,
      });
      added++;
    } else {
      // Update counts/metadata but preserve existing decision
      await db
        .update(subscriptions)
        .set({
          emailCount: sender.emailCount,
          lastSubject: sender.lastSubject,
          lastDate: sender.lastDate,
          unsubscribeUrl: sender.unsubscribeUrl,
          unsubscribeMailto: sender.unsubscribeMailto,
          hasOneClick: sender.hasOneClick ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existing.id));
      updated++;
    }
  }

  return NextResponse.json({
    scanned: senders.length,
    added,
    updated,
  });
}
