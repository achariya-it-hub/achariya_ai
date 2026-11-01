"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Video,
  Banknote,
  CheckCheck,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { user } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const meetings = useCRMStore((s) => s.meetings);
  const members = useCRMStore((s) => s.members);

  const currentMember = members.find((m) => m.email === user?.email);
  const isElevated = user?.role === "admin" || user?.role === "manager";
  const isTrainee = user?.role === "trainee";

  // Calculate position safely clamped within viewport
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const padding = 12;

    if (isMobile) {
      setCoords({
        top: Math.min(rect.bottom + 8, window.innerHeight - 200),
        left: padding,
        width: Math.max(280, window.innerWidth - padding * 2),
      });
    } else {
      const popoverWidth = 384; // 24rem
      let left = rect.left;
      // If it overflows right side, shift left
      if (left + popoverWidth > window.innerWidth - padding) {
        left = window.innerWidth - popoverWidth - padding;
      }
      // If it overflows left side, clamp to left margin
      left = Math.max(padding, left);

      setCoords({
        top: Math.min(rect.bottom + 8, window.innerHeight - 200),
        left,
        width: popoverWidth,
      });
    }
  }, []);

  // Update coords when opening or on window resize
  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Dynamically compute notifications from current state
  const notifications = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      type: "task" | "approval" | "meeting" | "payout" | "alert";
      link: string;
    }> = [];

    const now = new Date();

    // 1. Overdue tasks
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done" &&
        (isElevated || t.assigneeId === user?.id || t.assigneeId === currentMember?.id)
    );

    overdueTasks.slice(0, 4).forEach((t) => {
      list.push({
        id: `notif-overdue-${t.id}`,
        title: "Task Overdue",
        message: `"${t.title}" was due on ${new Date(t.dueDate!).toLocaleDateString("en-GB")}`,
        time: "Action required",
        type: "alert",
        link: "/dashboard/tasks",
      });
    });

    // 2. Tasks awaiting review (for Managers & Admins)
    if (isElevated) {
      const reviewTasks = tasks.filter((t) => t.status === "review");
      if (reviewTasks.length > 0) {
        list.push({
          id: "notif-reviews-pending",
          title: "Proof Approvals Needed",
          message: `${reviewTasks.length} task${reviewTasks.length > 1 ? "s are" : " is"} awaiting manager proof verification.`,
          time: "Just now",
          type: "approval",
          link: "/dashboard/tasks",
        });
      }
    }

    // 3. Trainee revision feedback (for Trainees)
    if (isTrainee) {
      const revisionTasks = tasks.filter(
        (t) =>
          (t.assigneeId === user?.id || t.assigneeId === currentMember?.id) &&
          t.reviewFeedback &&
          t.status !== "done"
      );
      revisionTasks.forEach((t) => {
        list.push({
          id: `notif-rev-${t.id}`,
          title: "Revision Requested",
          message: `Manager feedback on "${t.title}": ${t.reviewFeedback}`,
          time: "Needs update",
          type: "alert",
          link: "/dashboard/tasks",
        });
      });

      // Approved payouts
      const approvedTasks = tasks.filter(
        (t) =>
          (t.assigneeId === user?.id || t.assigneeId === currentMember?.id) &&
          t.payoutStatus === "approved" &&
          t.payout > 0
      );
      if (approvedTasks.length > 0) {
        const totalApproved = approvedTasks.reduce((s, t) => s + t.payout, 0);
        list.push({
          id: "notif-approved-payout",
          title: "Payout Approved!",
          message: `₹${totalApproved.toLocaleString()} in task payouts has been approved for disbursement.`,
          time: "Verified",
          type: "payout",
          link: "/dashboard/tasks",
        });
      }
    }

    // 4. Meetings today
    const todayMeetings = meetings.filter((m) => {
      const d = new Date(m.startTime);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });

    todayMeetings.slice(0, 2).forEach((m) => {
      list.push({
        id: `notif-meet-${m.id}`,
        title: "Meeting Scheduled Today",
        message: `${m.title} at ${new Date(m.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        time: "Today",
        type: "meeting",
        link: "/dashboard/meetings",
      });
    });

    return list;
  }, [tasks, meetings, isElevated, isTrainee, user, currentMember]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case "approval":
        return <CheckCircle2 className="h-4 w-4 text-indigo-600" />;
      case "meeting":
        return <Video className="h-4 w-4 text-blue-600" />;
      case "payout":
        return <Banknote className="h-4 w-4 text-emerald-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Notifications & Alerts"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#1A3A5C]">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && coords && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-[1px] sm:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                maxHeight: "calc(100vh - 100px)",
              }}
              className="fixed z-[9999] rounded-2xl bg-white p-3.5 shadow-2xl border border-slate-200 text-slate-900 flex flex-col"
            >
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto space-y-2 pr-1 max-h-[380px]">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Sparkles className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                    All caught up! No pending alerts.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          setReadIds((prev) => new Set([...prev, n.id]));
                          setOpen(false);
                          router.push(n.link);
                        }}
                        className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isRead
                            ? "bg-slate-50/70 border-slate-100 opacity-60 hover:opacity-90"
                            : "bg-indigo-50/40 hover:bg-indigo-50/80 border-indigo-100/70 shadow-2xs"
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white shadow-2xs shrink-0 mt-0.5 border border-slate-100">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                              {n.time}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed break-words">
                            {n.message}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 self-center" />
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
