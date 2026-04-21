"use client";

import { X, Heart } from "lucide-react";

interface Props {
  onKeep: () => void;
  onUnsubscribe: () => void;
  disabled?: boolean;
}

export default function ActionButtons({ onKeep, onUnsubscribe, disabled }: Props) {
  return (
    <div className="flex gap-8 justify-center">
      <button
        onClick={onUnsubscribe}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Unsubscribe"
      >
        <X size={28} />
      </button>
      <button
        onClick={onKeep}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-green-500 hover:bg-green-50 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Keep"
      >
        <Heart size={28} />
      </button>
    </div>
  );
}
