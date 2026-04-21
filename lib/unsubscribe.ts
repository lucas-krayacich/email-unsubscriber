export type UnsubStatus = "succeeded" | "failed" | "manual_needed";

export interface UnsubscribeResult {
  status: UnsubStatus;
  detail?: string;
}

export async function executeUnsubscribe(params: {
  unsubscribeUrl: string | null;
  unsubscribeMailto: string | null;
  hasOneClick: boolean;
}): Promise<UnsubscribeResult> {
  const { unsubscribeUrl, unsubscribeMailto, hasOneClick } = params;

  // 1. RFC 8058 one-click POST
  if (hasOneClick && unsubscribeUrl) {
    try {
      const res = await fetch(unsubscribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { status: "succeeded" };
      return { status: "failed", detail: `HTTP ${res.status}` };
    } catch (e) {
      return { status: "failed", detail: String(e) };
    }
  }

  // 2. HTTP GET
  if (unsubscribeUrl) {
    try {
      const res = await fetch(unsubscribeUrl, {
        method: "GET",
        signal: AbortSignal.timeout(15_000),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        return {
          status: "manual_needed",
          detail: "Confirmation page requires manual action",
        };
      }
      if (res.ok) return { status: "succeeded" };
      return { status: "failed", detail: `HTTP ${res.status}` };
    } catch (e) {
      return { status: "failed", detail: String(e) };
    }
  }

  // 3. mailto-only
  if (unsubscribeMailto) {
    return {
      status: "manual_needed",
      detail: `Send unsubscribe email to: ${unsubscribeMailto}`,
    };
  }

  // 4. Nothing
  return { status: "manual_needed", detail: "No unsubscribe method found" };
}
