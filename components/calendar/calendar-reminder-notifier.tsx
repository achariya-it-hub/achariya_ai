"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  ExternalLink,
  AlertTriangle,
  Building2,
  Bell,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export interface UncompletedWorkItem {
  id: string;
  source: "social" | "calendar";
  title: string;
  company: string;
  description?: string | null;
  scheduledTime: string;
  isOverdue: boolean;
  priority: "urgent" | "high" | "medium" | "low";
  category?: string;
  platform?: string;
  reminderInterval: number; // in minutes
  snoozedUntil?: string | null;
  lastRemindedAt?: string | null;
}

export function playReminderSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    // Friendly reminder chime tone 1 (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Friendly reminder chime tone 2 (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now + 0.15);
    gain2.gain.setValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (err) {
    // Audio autoplay might be restricted by browser policy before interaction
  }
}

export function playSuccessSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25); // C6
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    // ignore audio restriction
  }
}

export function CalendarReminderNotifier() {
  const {
    calendarEvents = [],
    socialPosts = [],
    toggleEventProcessed,
    snoozeCalendarReminder,
    toggleSocialPostProcessed,
    snoozeSocialPostReminder,
  } = useCRMStore();
  const { user } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const lastSoundPlayedRef = useRef<number>(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Check browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationAccess = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted") {
          toast.success("Desktop calendar reminders enabled!");
          new Notification("Digiventures Calendar Reminders", {
            body: "You will now receive desktop notifications for uncompleted calendar events & posts.",
            icon: "/logo.png",
          });
        }
      } catch (e) {
        // ignore
      }
    }
  };

  // Build unified list of all uncompleted works
  const uncompletedWorks = useMemo(() => {
    const now = Date.now();
    const list: UncompletedWorkItem[] = [];

    // 1. Incomplete Social Posts from Calendar
    (socialPosts || []).forEach((post) => {
      const isCompleted = post.isProcessed === true || post.status === "published" || post.status === "archived";
      if (!isCompleted) {
        const timeStr = post.scheduledAt || post.createdAt;
        const timeMs = new Date(timeStr).getTime();
        list.push({
          id: post.id,
          source: "social",
          title: post.title || "Untitled Post",
          company: post.company || "Digiventures",
          description: post.content || post.description || null,
          scheduledTime: timeStr,
          isOverdue: !isNaN(timeMs) && timeMs < now,
          priority: "high",
          platform: post.platform,
          reminderInterval: post.reminderInterval || 30,
          snoozedUntil: post.snoozedUntil,
          lastRemindedAt: post.lastRemindedAt,
        });
      }
    });

    // 2. Incomplete Calendar Events
    (calendarEvents || []).forEach((ev) => {
      const isCompleted = ev.isProcessed === true || ev.status === "completed" || ev.status === "cancelled" || ev.status === "processed";
      if (!isCompleted) {
        const timeStr = ev.start || ev.createdAt;
        const timeMs = new Date(timeStr).getTime();
        list.push({
          id: ev.id,
          source: "calendar",
          title: ev.title || "Untitled Event",
          company: ev.company || "Digiventures",
          description: ev.description || null,
          scheduledTime: timeStr,
          isOverdue: !isNaN(timeMs) && timeMs < now,
          priority: (ev.priority as any) || "medium",
          category: ev.category || ev.type,
          reminderInterval: ev.reminderInterval || 15,
          snoozedUntil: ev.snoozedUntil,
          lastRemindedAt: ev.lastRemindedAt,
        });
      }
    });

    // Sort: overdue first, then nearest scheduled time
    return list.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });
  }, [socialPosts, calendarEvents]);

  // Filter by company if user chooses a company inside the drawer
  const filteredWorks = useMemo(() => {
    if (selectedCompanyFilter === "all") return uncompletedWorks;
    return uncompletedWorks.filter(
      (w) => w.company.toLowerCase() === selectedCompanyFilter.toLowerCase()
    );
  }, [uncompletedWorks, selectedCompanyFilter]);

  // Check which uncompleted items are actively due right now (not snoozed)
  const dueItems = useMemo(() => {
    const now = Date.now();
    return filteredWorks.filter((item) => {
      // If snoozed in future, do not trigger active alert yet
      if (item.snoozedUntil && new Date(item.snoozedUntil).getTime() > now) {
        return false;
      }
      const itemTime = new Date(item.scheduledTime).getTime();
      const isNearOrOverdue = isNaN(itemTime) || itemTime <= now + 3600000; // started or due within next 1 hr
      return isNearOrOverdue;
    });
  }, [filteredWorks]);

  // Periodic reminder checking and Web Notifications
  useEffect(() => {
    const timer = setInterval(() => {
      if (dueItems.length > 0) {
        const now = Date.now();

        // 1. Sound reminder (every 2.5 minutes)
        if (soundEnabled && now - lastSoundPlayedRef.current > 150000) {
          playReminderSound();
          lastSoundPlayedRef.current = now;
        }

        // 2. Desktop Web Notification for newly due item
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const topDue = dueItems[0];
          if (topDue && !notifiedIdsRef.current.has(topDue.id)) {
            notifiedIdsRef.current.add(topDue.id);
            const statusLabel = topDue.isOverdue ? "OVERDUE" : "DUE SOON";
            new Notification(`⏰ [${statusLabel}] Calendar Work: ${topDue.title}`, {
              body: `Company: ${topDue.company} • Scheduled for ${format(new Date(topDue.scheduledTime), "h:mm a")}`,
              icon: "/logo.png",
              tag: topDue.id,
            });
          }
        }
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [dueItems, soundEnabled]);

  // If no uncompleted items at all, don't show the reminder bar
  if (uncompletedWorks.length === 0) {
    return null;
  }

  const currentItem = dueItems[0] || filteredWorks[0];
  const overdueCount = filteredWorks.filter((w) => w.isOverdue).length;

  if (isDismissed) {
    return (
      <aside aria-label="Pending calendar works reminder" className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 text-amber-300 border border-amber-500/40 shadow-2xl backdrop-blur-xl text-xs font-semibold hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all group"
          title="Click to view calendar works reminders"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${overdueCount > 0 ? "bg-red-400" : "bg-amber-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${overdueCount > 0 ? "bg-red-500" : "bg-amber-500"}`}></span>
          </span>
          <BellRing className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-red-400" : "text-amber-400"}`} />
          <span>{overdueCount > 0 ? `${overdueCount} Overdue Works` : `${uncompletedWorks.length} Pending`}</span>
        </button>
      </aside>
    );
  }

  // Handlers for completing an item
  const handleMarkComplete = async (item: UncompletedWorkItem) => {
    playSuccessSound();
    if (item.source === "social") {
      await toggleSocialPostProcessed(item.id, true);
    } else {
      await toggleEventProcessed(item.id, true, user?.name || "User");
    }
    toast.success(`"${item.title}" marked as completed!`);
  };

  // Handlers for snoozing an item
  const handleSnooze = async (item: UncompletedWorkItem, minutes: number) => {
    if (item.source === "social") {
      await snoozeSocialPostReminder(item.id, minutes);
    } else {
      await snoozeCalendarReminder(item.id, minutes);
    }
    toast.info(`Reminder snoozed for ${minutes} minutes`);
  };

  // Distinct company list from uncompleted works
  const companyOptions = Array.from(new Set(uncompletedWorks.map((w) => w.company)));

  return (
    <aside
      aria-label="Pending calendar works reminder"
      className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-full px-3 sm:px-0"
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-amber-500/30 bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${overdueCount > 0 ? "bg-red-400" : "bg-amber-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${overdueCount > 0 ? "bg-red-500" : "bg-amber-500"}`}></span>
              </span>
              <div className="flex items-center gap-2">
                <BellRing className={`h-4 w-4 ${overdueCount > 0 ? "text-red-400" : "text-amber-400"}`} />
                <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  {overdueCount > 0
                    ? `${overdueCount} Overdue Calendar Works`
                    : `${uncompletedWorks.length} Incomplete Works`}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {notificationPermission === "default" && (
                <button
                  type="button"
                  onClick={requestNotificationAccess}
                  className="px-2 py-1 text-[10px] font-semibold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg border border-pink-500/30 transition-colors flex items-center gap-1"
                  title="Enable desktop notifications"
                >
                  <Bell className="h-3 w-3" />
                  Enable Alerts
                </button>
              )}

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title={soundEnabled ? "Mute reminder sound" : "Unmute reminder sound"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-white/40" />}
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title={isExpanded ? "Collapse" : "Expand all"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 hover:text-red-300 transition-colors ml-0.5"
                title="Close reminder"
                aria-label="Close reminder"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Primary Active Card */}
          {currentItem && (
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Company Badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {currentItem.company}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        currentItem.isOverdue
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {currentItem.isOverdue ? "Overdue" : "Due Soon"}
                    </span>

                    <span className="text-[11px] text-white/60 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(currentItem.scheduledTime), "MMM d, h:mm a")}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                    {currentItem.title}
                  </h3>

                  {currentItem.description && (
                    <p className="text-[11px] text-white/60 line-clamp-2 italic">
                      &quot;{currentItem.description}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Status Note */}
              <div className="text-[11px] text-amber-300/90 flex items-center justify-between bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>
                    {currentItem.isOverdue
                      ? `Overdue (${formatDistanceToNow(new Date(currentItem.scheduledTime))} ago)`
                      : `Scheduled ${formatDistanceToNow(new Date(currentItem.scheduledTime), { addSuffix: true })}`}
                  </span>
                </span>
                <span className="text-[10px] text-white/50">
                  Every {currentItem.reminderInterval}m
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleMarkComplete(currentItem)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </button>

                {/* Snooze Dropdown Button */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => handleSnooze(currentItem, 15)}
                    className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium py-2 px-3 rounded-xl transition-all"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Snooze 15m
                  </button>
                  <div className="absolute bottom-full right-0 mb-1 hidden group-hover:flex flex-col bg-slate-800 border border-white/10 rounded-xl shadow-xl p-1 text-[11px] min-w-[100px] z-50">
                    <button
                      type="button"
                      onClick={() => handleSnooze(currentItem, 10)}
                      className="text-left px-2 py-1 hover:bg-white/10 rounded text-white"
                    >
                      10 mins
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnooze(currentItem, 30)}
                      className="text-left px-2 py-1 hover:bg-white/10 rounded text-white"
                    >
                      30 mins
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnooze(currentItem, 60)}
                      className="text-left px-2 py-1 hover:bg-white/10 rounded text-white"
                    >
                      1 hour
                    </button>
                  </div>
                </div>

                <Link
                  href="/dashboard/social"
                  className="p-2 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-xl transition-all"
                  title="View in Calendar"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Expanded Drawer: All Pending Works & Company Filter */}
          {isExpanded && (
            <div className="max-h-64 overflow-y-auto border-t border-white/10 px-4 py-3 space-y-2.5 bg-black/30 text-xs">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                  All Pending Works ({filteredWorks.length}):
                </span>

                {/* Company Filter inside Drawer */}
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="bg-slate-800 text-white text-[11px] px-2 py-1 rounded-md border border-white/15 focus:outline-none"
                >
                  <option value="all">All Companies</option>
                  {companyOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {filteredWorks.map((work) => (
                <div
                  key={work.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors gap-2"
                >
                  <div className="truncate pr-2 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300">
                        {work.company}
                      </span>
                      {work.isOverdue && (
                        <span className="text-[9px] font-bold text-red-400">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-white truncate text-xs">{work.title}</p>
                    <p className="text-[10px] text-white/50">
                      {format(new Date(work.scheduledTime), "MMM d, h:mm a")}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSnooze(work, 15)}
                      className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded"
                      title="Snooze 15m"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkComplete(work)}
                      className="text-emerald-400 hover:text-emerald-300 font-medium text-[11px] px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg border border-emerald-500/30 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
