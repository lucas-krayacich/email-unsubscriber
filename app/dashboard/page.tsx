"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import CardStack from "@/components/CardStack";
import ScanButton from "@/components/ScanButton";
import { Subscription } from "@/components/SwipeCard";
import { History, LogOut } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
    if (status === "authenticated") fetchSubscriptions();
  }, [status, router, fetchSubscriptions]);

  async function handleDecide(id: string, decision: "keep" | "unsubscribe") {
    await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="font-bold text-gray-900">Email Unsubscriber</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/history"
            className="text-gray-500 hover:text-gray-700 p-1"
            title="History"
          >
            <History size={20} />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">
        <ScanButton onComplete={fetchSubscriptions} />

        {subscriptions.length === 0 && !loading ? (
          <div className="text-center text-gray-500">
            <p>No pending subscriptions.</p>
            <p className="text-sm mt-1">Click &quot;Scan Inbox&quot; to get started.</p>
          </div>
        ) : (
          <CardStack
            subscriptions={subscriptions}
            onDecide={handleDecide}
          />
        )}
      </main>

      {/* User info */}
      {session?.user && (
        <footer className="text-center py-3 text-xs text-gray-400">
          Signed in as {session.user.email}
        </footer>
      )}
    </div>
  );
}
