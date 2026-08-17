"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";

export default function ProgressRing({
  value,
  label,
  color,
  size = 60,
  stroke = 6,
}: {
  value: number;
  label?: string;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const id = useId();
  const [hover, setHover] = useState(false);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));
  const offset = c * (1 - clamped / 100);
  const shortLabel = label || "";
  const nameSize = Math.max(8, size / 11);
  const percentSize = Math.max(11, size / 7);

  return (
    <motion.div
      className="relative shrink-0 cursor-pointer z-10"
      style={{ width: size, height: size }}
      animate={{ scale: hover ? 1.18 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
        />
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center leading-none px-2"
        style={{ gap: hover ? 3 : 4 }}
      >
        <span
          className="font-semibold uppercase tracking-wide text-slate-500 text-center"
          style={{
            maxWidth: "100%",
            fontSize: hover ? nameSize * 0.92 : nameSize,
            lineHeight: hover ? 1.15 : 1,
            whiteSpace: hover ? "normal" : "nowrap",
            textOverflow: hover ? "clip" : "ellipsis",
            overflow: "hidden",
          }}
          title={shortLabel}
        >
          {shortLabel}
        </span>
        <span className="font-extrabold shrink-0" style={{ color, fontSize: percentSize }}>
          {Math.round(clamped)}%
        </span>
      </div>
    </motion.div>
  );
}