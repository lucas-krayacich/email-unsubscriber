"use client";

import { useState, useRef } from "react";
import TinderCard from "react-tinder-card";

type Direction = "left" | "right" | "up" | "down";
interface TinderCardAPI {
  swipe(dir?: Direction): Promise<void>;
  restoreCard(): Promise<void>;
}

import SwipeCard, { Subscription } from "./SwipeCard";
import ActionButtons from "./ActionButtons";

const CARD_W = 340;
const CARD_H = 420;
const VISIBLE = 3;

interface Props {
  subscriptions: Subscription[];
  onDecide: (id: string, decision: "keep" | "unsubscribe") => Promise<void>;
}

export default function CardStack({ subscriptions, onDecide }: Props) {
  const [subs, setSubs] = useState(subscriptions);
  const [deciding, setDeciding] = useState(false);
  const topRef = useRef<TinderCardAPI | null>(null);

  async function handleSwipe(direction: Direction, sub: Subscription) {
    const decision = direction === "left" ? "unsubscribe" : "keep";
    setDeciding(true);
    try {
      await onDecide(sub.id, decision);
    } finally {
      setSubs((prev) => prev.filter((s) => s.id !== sub.id));
      setDeciding(false);
    }
  }

  async function swipe(dir: Direction) {
    if (topRef.current) await topRef.current.swipe(dir);
  }

  if (subs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <p className="text-2xl">🎉</p>
        <p className="text-gray-600 font-medium">All caught up!</p>
        <p className="text-gray-400 text-sm">Scan again to find new senders.</p>
      </div>
    );
  }

  // Last item = top card
  const visible = subs.slice(-VISIBLE);
  const topSub = visible[visible.length - 1];
  // Cards behind, ordered furthest-back first
  const behindSubs = visible.slice(0, -1);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">{subs.length} remaining</p>

      <div style={{ position: "relative", width: CARD_W, height: CARD_H + 30 }}>
        {/* Background cards — plain divs, not swipeable */}
        {behindSubs.map((sub, i) => {
          // i=0 is furthest back, i=length-1 is just behind top
          const depth = behindSubs.length - i; // 1 = just behind, 2 = further
          return (
            <div
              key={sub.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: CARD_W,
                height: CARD_H,
                zIndex: i + 1,
                transform: `scale(${1 - depth * 0.04}) translateY(${depth * 12}px)`,
                transformOrigin: "top center",
                pointerEvents: "none",
              }}
            >
              <SwipeCard sub={sub} />
            </div>
          );
        })}

        {/*
          Wrapper pinned to top-left so TinderCard (which uses position:absolute
          internally) sits exactly over the background cards.
          We give it explicit dimensions so there's a proper hit area to drag.
        */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CARD_W,
            height: CARD_H,
            zIndex: VISIBLE + 1,
          }}
        >
          <TinderCard
            ref={topRef as React.RefObject<TinderCardAPI>}
            onSwipe={(dir) => handleSwipe(dir, topSub)}
            preventSwipe={["up", "down"]}
            swipeRequirementType="position"
            swipeThreshold={80}
          >
            {/* Normal-flow div — gives TinderCard its size */}
            <div style={{ width: CARD_W, height: CARD_H }}>
              <SwipeCard sub={topSub} />
            </div>
          </TinderCard>
        </div>
      </div>

      <ActionButtons
        onUnsubscribe={() => swipe("left")}
        onKeep={() => swipe("right")}
        disabled={deciding || subs.length === 0}
      />
    </div>
  );
}
