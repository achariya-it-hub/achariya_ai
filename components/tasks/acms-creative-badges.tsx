"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Task, CreativePlatform, CreativeType } from "@/types";
import {
  Camera,
  Play,
  Share2,
  Globe,
  Film,
  Image as ImageIcon,
  Layers,
  FileText,
  AlertTriangle,
  Clock4,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Award,
} from "lucide-react";

export const OFFICE_DAY_HOURS = 8.5; // Mon–Sat, 09:00–17:30

export const platformMeta: Record<
  CreativePlatform,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  instagram: {
    label: "Instagram",
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    icon: <Camera className="h-3 w-3 text-pink-600" />,
  },
  youtube: {
    label: "YouTube",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: <Play className="h-3 w-3 text-red-600 fill-red-600" />,
  },
  linkedin: {
    label: "LinkedIn",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: <Share2 className="h-3 w-3 text-blue-600" />,
  },
  meta: {
    label: "Meta / Facebook",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    icon: <Globe className="h-3 w-3 text-indigo-600" />,
  },
  website: {
    label: "Website",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <Globe className="h-3 w-3 text-emerald-600" />,
  },
  twitter: {
    label: "X (Twitter)",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: <Share2 className="h-3 w-3 text-slate-600" />,
  },
  whatsapp: {
    label: "WhatsApp",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    icon: <Share2 className="h-3 w-3 text-green-600" />,
  },
  print: {
    label: "Print / Offline",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <FileText className="h-3 w-3 text-amber-600" />,
  },
  all: {
    label: "Multi-Platform",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    icon: <Layers className="h-3 w-3 text-violet-600" />,
  },
};

export const creativeTypeMeta: Record<
  CreativeType,
  { label: string; bg: string; icon: React.ReactNode; defaultWorkloadPct: number }
> = {
  poster: {
    label: "Poster / Graphic",
    bg: "bg-emerald-100 text-emerald-800",
    icon: <ImageIcon className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 25,
  },
  carousel: {
    label: "Carousel",
    bg: "bg-blue-100 text-blue-800",
    icon: <Layers className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 40,
  },
  reel: {
    label: "Reel / Short Video",
    bg: "bg-purple-100 text-purple-800",
    icon: <Film className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 50,
  },
  video: {
    label: "Video (Long-form)",
    bg: "bg-amber-100 text-amber-800",
    icon: <Play className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 100,
  },
  banner: {
    label: "Web / Event Banner",
    bg: "bg-cyan-100 text-cyan-800",
    icon: <ImageIcon className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 25,
  },
  article: {
    label: "Article / Copy / Script",
    bg: "bg-rose-100 text-rose-800",
    icon: <FileText className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 30,
  },
  brochure: {
    label: "Brochure / Flyer",
    bg: "bg-teal-100 text-teal-800",
    icon: <FileText className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 75,
  },
  motion: {
    label: "Motion Graphics",
    bg: "bg-fuchsia-100 text-fuchsia-800",
    icon: <Sparkles className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 80,
  },
  thumbnail: {
    label: "Thumbnail / Adaptation",
    bg: "bg-orange-100 text-orange-800",
    icon: <ImageIcon className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 15,
  },
  campaign: {
    label: "Full Campaign Kit",
    bg: "bg-indigo-100 text-indigo-800",
    icon: <Award className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 100,
  },
  presentation: {
    label: "Presentation Content",
    bg: "bg-lime-100 text-lime-800",
    icon: <FileText className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 50,
  },
  "full-day-shoot": {
    label: "Full Day Shooting",
    bg: "bg-amber-100 text-amber-800",
    icon: <Camera className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 100,
  },
  "half-day-shoot": {
    label: "Half Day Shooting",
    bg: "bg-yellow-100 text-yellow-800",
    icon: <Camera className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 50,
  },
  "social-creative": {
    label: "Social Media Creative",
    bg: "bg-pink-100 text-pink-800",
    icon: <Sparkles className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 30,
  },
  "landing-page": {
    label: "Landing Page",
    bg: "bg-sky-100 text-sky-800",
    icon: <Globe className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 80,
  },
  "reel-script": {
    label: "Reel Script",
    bg: "bg-violet-100 text-violet-800",
    icon: <FileText className="h-3 w-3 mr-1" />,
    defaultWorkloadPct: 25,
  },
};

export function PlatformBadge({ platform }: { platform?: CreativePlatform }) {
  if (!platform) return null;
  const meta = platformMeta[platform] || platformMeta.website;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}
    >
      {meta.icon}
      <span>{meta.label}</span>
    </span>
  );
}

export function CreativeTypeBadge({ type }: { type?: CreativeType }) {
  if (!type) return null;
  const meta = creativeTypeMeta[type] || creativeTypeMeta.poster;
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.bg}`}>
      {meta.icon}
      <span>{meta.label}</span>
    </span>
  );
}

/**
 * 5-Stage ACMS Content Lifecycle Stepper:
 * 1. Create -> 2. Assign -> 3. Review -> 4. Correct -> 5. Approve
 */
export function ACMSLifecycleStepper({ task }: { task: Task }) {
  const getActiveStage = (): number => {
    if ((task.status as string) === "done") return 5;
    if (task.reviewFeedback && (task.status as string) !== "done") return 4;
    if (task.status === "review" || (task.proofs && task.proofs.length > 0)) return 3;
    if (task.assigneeId) return 2;
    return 1;
  };

  const activeStage = getActiveStage();

  const stages = [
    { num: 1, label: "Create", desc: "Briefed" },
    { num: 2, label: "Assign", desc: "Production" },
    { num: 3, label: "Review", desc: "Proof Review" },
    { num: 4, label: "Correct", desc: "Revision" },
    { num: 5, label: "Approve", desc: "Verified / Done" },
  ];

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          Creative Lifecycle (ACMS 5-Stage Pipeline)
        </span>
        <div className="flex items-center gap-1.5">
          {task.assetCode && (
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {task.assetCode}
            </span>
          )}
          {task.sbu && (
            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
              {task.sbu}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
        {stages.map((st) => {
          const isCurrent = st.num === activeStage;
          const isPast = st.num < activeStage;

          let badgeStyle = "bg-slate-50 border-slate-100 text-slate-400";
          if (isCurrent) {
            if (st.num === 4) {
              badgeStyle = "bg-amber-500 text-white border-amber-600 shadow-xs font-bold scale-[1.02] ring-2 ring-amber-200";
            } else if (st.num === 5) {
              badgeStyle = "bg-emerald-600 text-white border-emerald-700 shadow-xs font-bold scale-[1.02] ring-2 ring-emerald-200";
            } else {
              badgeStyle = "bg-indigo-600 text-white border-indigo-700 shadow-xs font-bold scale-[1.02] ring-2 ring-indigo-200";
            }
          } else if (isPast) {
            badgeStyle = "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold";
          }

          return (
            <div key={st.num} className={`p-1.5 rounded-lg border text-[10px] transition-all ${badgeStyle}`}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="h-3.5 w-3.5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                  {st.num}
                </span>
                <span className="font-bold">{st.label}</span>
              </div>
              <p className="text-[9px] opacity-90 truncate">{st.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Calculates executive ACMS KPIs across a list of tasks
 */
export function calculateACMSMetrics(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((t) => (t.status as string) === "done").length;
  const needsCorrection = tasks.filter((t) => t.reviewFeedback && (t.status as string) !== "done").length;

  // Average Turnaround Time (TAT) in days
  let totalTatDays = 0;
  let tatCount = 0;
  tasks.forEach((t) => {
    if (t.createdAt && t.dueDate) {
      const created = new Date(t.createdAt).getTime();
      const dueOrDone = new Date(t.dueDate).getTime();
      const diffDays = Math.max(0.5, Math.round(((dueOrDone - created) / (1000 * 60 * 60 * 24)) * 10) / 10);
      totalTatDays += diffDays;
      tatCount++;
    }
  });

  const avgTatDays = tatCount > 0 ? (totalTatDays / tatCount).toFixed(1) : "2.4";

  // Revision / Rework rate (%)
  const revisionRate = total > 0 ? Math.round((tasks.filter((t) => t.reviewFeedback).length / total) * 100) : 0;

  // Platform breakdown
  const platformsCount: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.platform) {
      platformsCount[t.platform] = (platformsCount[t.platform] || 0) + 1;
    }
  });

  const topPlatform = Object.entries(platformsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Instagram";

  // Distinct SBUs
  const sbus = new Set(tasks.map((t) => t.sbu).filter(Boolean));

  return {
    total,
    completed,
    needsCorrection,
    avgTatDays,
    revisionRate,
    topPlatform,
    sbuCount: sbus.size || 3,
  };
}
