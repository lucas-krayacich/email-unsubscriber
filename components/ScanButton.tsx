"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  onComplete: () => void;
}

export default function ScanButton({ onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(`Found ${data.scanned} senders (+${data.added} new)`);
        onComplete();
      } else {
        setResult("Scan failed. Try again.");
      }
    } catch {
      setResult("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleScan}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Scanning…" : "Scan Inbox"}
      </button>
      {result && <p className="text-sm text-gray-500">{result}</p>}
    </div>
  );
}
