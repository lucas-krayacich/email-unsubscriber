"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface HistoryRow {
  id: string;
  senderName: string;
  senderAddress: string;
  emailCount: number;
  decision: "keep" | "unsubscribe";
  unsubStatus: string;
  updatedAt: number | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  succeeded: <CheckCircle size={16} className="text-green-500" />,
  failed: <XCircle size={16} className="text-red-500" />,
  manual_needed: <AlertCircle size={16} className="text-yellow-500" />,
  not_attempted: null,
};

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
    if (status === "authenticated") {
      fetch("/api/subscriptions/history")
        .then((r) => r.json())
        .then((d) => setRows(d))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-gray-900">History</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <p className="text-gray-400 text-center animate-pulse">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-center">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => (
              <li key={row.id} className="py-3 flex items-start gap-3">
                <div
                  className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${
                    row.decision === "keep" ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 truncate">
                    {row.senderName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {row.senderAddress}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {STATUS_ICON[row.unsubStatus]}
                  <span className="text-xs text-gray-500 capitalize">
                    {row.decision}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
