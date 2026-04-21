"use client";

import { Mail, Hash } from "lucide-react";

export interface Subscription {
  id: string;
  senderName: string;
  senderAddress: string;
  lastSubject: string | null;
  emailCount: number;
  unsubscribeUrl: string | null;
  unsubscribeMailto: string | null;
  hasOneClick: number;
}

interface Props {
  sub: Subscription;
}

export default function SwipeCard({ sub }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4 w-full h-full select-none">
      {/* Avatar */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl flex-shrink-0">
          {sub.senderName[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{sub.senderName}</p>
          <p className="text-sm text-gray-500 truncate">{sub.senderAddress}</p>
        </div>
      </div>

      {/* Last subject */}
      {sub.lastSubject && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Last email
          </p>
          <p className="text-gray-700 text-sm line-clamp-3">{sub.lastSubject}</p>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 mt-auto">
        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <Hash size={14} />
          <span>{sub.emailCount} emails</span>
        </div>
        {(sub.unsubscribeUrl || sub.unsubscribeMailto) && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm">
            <Mail size={14} />
            <span>{sub.hasOneClick ? "One-click" : "Has unsub link"}</span>
          </div>
        )}
      </div>

      {/* Hint labels */}
      <div className="flex justify-between text-xs font-bold mt-1">
        <span className="text-red-400">← UNSUBSCRIBE</span>
        <span className="text-green-400">KEEP →</span>
      </div>
    </div>
  );
}
