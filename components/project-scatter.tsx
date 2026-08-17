"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { Project } from "@/types";

const W = 780;
const H = 430;
const PAD = { l: 48, r: 30, t: 30, b: 48 };

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  completed: "#3b82f6",
  "on-hold": "#f59e0b",
  cancelled: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  "on-hold": "On Hold",
  cancelled: "Cancelled",
};

export default function ProjectScatter() {
  const projects = useCRMStore((s) => s.projects);
  const [hovered, setHovered] = useState<Project | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });

  const data = useMemo(
    () =>
      projects.map((p) => {
        const dur = Math.max(
          1,
          Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000)
        );
        return { p, dur, progress: p.progress, members: p.memberIds?.length || 0 };
      }),
    [projects]
  );

  const minDur = data.length ? Math.min(...data.map((d) => d.dur)) : 0;
  const maxDur = data.length ? Math.max(...data.map((d) => d.dur)) : 1;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const xFor = (dur: number) => PAD.l + ((dur - minDur) / (maxDur - minDur || 1)) * plotW;
  const yFor = (progress: number) => PAD.t + ((100 - progress) / 100) * plotH;
  const rFor = (n: number) => Math.max(9, Math.min(26, 7 + n * 3));

  const yTicks = [0, 25, 50, 75, 100];
  const xTicks = Array.from({ length: 5 }, (_, i) => minDur + (((maxDur - minDur) / 4) * i + 0.4));

  if (projects.length === 0) return null;

  const tipW = 190;
  const tipH = 92;

  return (
    <div>
      <div className="relative bg-gradient-to-b from-slate-50/60 to-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          onMouseLeave={() => setHovered(null)}
        >
          {/* grid / axis */}
          <defs>
            <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.06" />
            </linearGradient>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* horizontal grid lines + labels */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} y1={yFor(t)} x2={W - PAD.r} y2={yFor(t)} stroke="#eef2f7" strokeWidth="1" />
              <text x={PAD.l - 8} y={yFor(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                {t}%
              </text>
            </g>
          ))}

          {/* vertical grid lines + labels (duration in days) */}
          {xTicks.map((t, i) => {
            const xv = xFor(t);
            return (
              <g key={i}>
                <line x1={xv} y1={yFor(0)} x2={xv} y2={yFor(100)} stroke="#eef2f7" strokeWidth="1" />
                <text x={xv} y={yFor(0) + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">
                  {Math.round(t)}d
                </text>
              </g>
            );
          })}

          {/* axis baseline */}
          <line x1={PAD.l} y1={yFor(0)} x2={W - PAD.r} y2={yFor(0)} stroke="#cbd5e1" strokeWidth="1.5" />

          {/* axis titles */}
          <text x={PAD.t + plotH / 2} y={12} textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748b" transform={`rotate(-90 ${12} ${PAD.t + plotH / 2})`}>
            Progress
          </text>
          <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748b">
            Project duration (days)
          </text>

          {/* altitude ticks from bar bases */}
          {data.map((d, i) => {
            const color = STATUS_COLORS[d.p.status] || "#64748b";
            const r = rFor(d.members);
            const cx = xFor(d.dur);
            const cy = yFor(d.progress);
            const baseY = yFor(0);
            return (
              <motion.g
                key={d.p.id}
                initial={{ opacity: 0, scale: 0.2, transformOrigin: `${cx}px ${cy}px` }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 220, damping: 18 }}
                onMouseEnter={() => {
                  setHovered(d.p);
                  setTip({ x: cx, y: cy });
                }}
              >
                {/* rising stem */}
                <motion.line
                  x1={cx}
                  y1={baseY}
                  x2={cx}
                  y2={cy}
                  stroke={color}
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                />
                {/* bubble */}
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  fillOpacity="0.18"
                  stroke={color}
                  strokeWidth="2.5"
                  filter={hovered?.id === d.p.id ? "url(#glow)" : undefined}
                  animate={{
                    r: hovered?.id === d.p.id ? r + 4 : r,
                    fillOpacity: hovered?.id === d.p.id ? 0.35 : 0.18,
                  }}
                  transition={{ duration: 0.2 }}
                />
                {/* core dot */}
                <circle cx={cx} cy={cy} r={r * 0.45} fill={color} />
                <circle cx={cx - r * 0.12} cy={cy - r * 0.18} r={r * 0.16} fill="#fff" fillOpacity="0.7" />
              </motion.g>
            );
          })}

          {/* tooltip */}
          <AnimatedTip x={tip.x} y={tip.y} project={hovered} tipW={tipW} tipH={tipH} />
        </svg>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-slate-500">
        {Object.entries(STATUS_LABELS).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[k] }} />
            {label}
          </span>
        ))}
        <span className="text-slate-400">Bubble size = assigning team members</span>
      </div>
    </div>
  );
}

function AnimatedTip({
  x,
  y,
  project,
  tipW,
  tipH,
}: {
  x: number;
  y: number;
  project: Project | null;
  tipW: number;
  tipH: number;
}) {
  if (!project) return null;
  const left = Math.max(PAD.l, Math.min(W - PAD.r - tipW, x + 14));
  const top = Math.max(PAD.t, Math.min(H - PAD.t - tipH, y - tipH - 14));
  const color = STATUS_COLORS[project.status] || "#64748b";
  return (
    <motion.g key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      <rect
        x={left}
        y={top}
        width={tipW}
        height={tipH}
        rx="12"
        fill="#ffffff"
        stroke="#e2e8f0"
        filter="drop-shadow(0 8px 16px rgba(15,23,42,0.12))"
      />
      <rect x={left + 12} y={top + 12} width={8} height={12} rx="4" fill={color} />
      <text x={left + 28} y={top + 22} fontSize="13" fontWeight="700" fill="#0f172a">
        {project.name.length > 22 ? project.name.slice(0, 22) + "…" : project.name}
      </text>
      <text x={left + 28} y={top + 38} fontSize="11" fill="#64748b">
        {STATUS_LABELS[project.status] || project.status} · {project.priority} priority
      </text>
      <text x={left + 12} y={top + 60} fontSize="11" fill="#334155">
        Progress: <tspan fontWeight="700" fill="#0f172a">{project.progress}%</tspan>
      </text>
      <text x={left + 12} y={top + 78} fontSize="11" fill="#334155">
        Duration: <tspan fontWeight="700" fill="#0f172a">{Math.max(1, Math.round((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 86400000))} days</tspan>
      </text>
    </motion.g>
  );
}