import { google } from "googleapis";

const CLIENT_ID = process.env.AUTH_GOOGLE_ID!;
const CLIENT_SECRET = process.env.AUTH_GOOGLE_SECRET!;

export interface SenderInfo {
  senderName: string;
  senderAddress: string;
  lastSubject: string;
  lastDate: string;
  emailCount: number;
  unsubscribeUrl: string | null;
  unsubscribeMailto: string | null;
  hasOneClick: boolean;
}

function parseFrom(header: string): { name: string; address: string } {
  // Match: "Name <email>" or just "email"
  const match = header.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), address: match[2].trim().toLowerCase() };
  }
  return { name: header.trim(), address: header.trim().toLowerCase() };
}

function parseListUnsubscribe(header: string): {
  url: string | null;
  mailto: string | null;
  hasOneClick: boolean;
} {
  const url = header.match(/<(https?:\/\/[^>]+)>/)?.[1] ?? null;
  const mailto = header.match(/<mailto:([^>]+)>/)?.[1] ?? null;
  return { url, mailto, hasOneClick: false };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scanGmail(
  accessToken: string,
  refreshToken: string
): Promise<SenderInfo[]> {
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  // 1. Collect all message IDs matching the query
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "unsubscribe newer_than:1y",
      maxResults: 500,
      pageToken,
    });
    const messages = res.data.messages ?? [];
    messageIds.push(...messages.map((m) => m.id!));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && messageIds.length < 5000);

  // 2. Fetch headers with limited concurrency (10 at a time = 50 quota units/sec)
  const senderMap = new Map<string, SenderInfo>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (id) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: [
            "From",
            "Subject",
            "Date",
            "List-Unsubscribe",
            "List-Unsubscribe-Post",
          ],
        });

        const headers = msg.data.payload?.headers ?? [];
        const get = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value ?? "";

        const fromRaw = get("From");
        if (!fromRaw) return;

        const { name, address } = parseFrom(fromRaw);
        const subject = get("Subject");
        const date = get("Date");
        const listUnsub = get("List-Unsubscribe");
        const listUnsubPost = get("List-Unsubscribe-Post");

        const { url, mailto } = listUnsub
          ? parseListUnsubscribe(listUnsub)
          : { url: null, mailto: null };

        const hasOneClick =
          !!url &&
          listUnsubPost.toLowerCase().includes("list-unsubscribe=one-click");

        const existing = senderMap.get(address);
        if (!existing) {
          senderMap.set(address, {
            senderName: name,
            senderAddress: address,
            lastSubject: subject,
            lastDate: date,
            emailCount: 1,
            unsubscribeUrl: url,
            unsubscribeMailto: mailto,
            hasOneClick,
          });
        } else {
          existing.emailCount += 1;
          // Keep most recent date's data
          if (date && (!existing.lastDate || date > existing.lastDate)) {
            existing.lastSubject = subject;
            existing.lastDate = date;
            if (url) existing.unsubscribeUrl = url;
            if (mailto) existing.unsubscribeMailto = mailto;
            if (hasOneClick) existing.hasOneClick = true;
          }
        }
      })
    );

    // Small pause between every batch to stay under quota
    await sleep(200);
  }

  return Array.from(senderMap.values());
}
