"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import {
  Search,
  CheckSquare,
  FolderKanban,
  Users,
  Video,
  Clock,
  Banknote,
  Calendar,
  MessageSquare,
  BarChart3,
  GanttChart,
  ArrowRight,
  Sparkles,
  Command,
  X,
} from "lucide-react";
import { initials } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const tasks = useCRMStore((s) => s.tasks);
  const projects = useCRMStore((s) => s.projects);
  const members = useCRMStore((s) => s.members);
  const meetings = useCRMStore((s) => s.meetings);
  const checkInOut = useCRMStore((s) => s.checkInOut);
  const attendance = useCRMStore((s) => s.attendance);

  const currentMember = members.find((m) => m.email === user?.email);
  const isClockedIn = !!attendance.find((a) => a.userId === (currentMember?.id || user?.id) && !a.clockOutAt);

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [open]);

  // Compute matched items
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();

    const quickActions = [
      {
        id: "act-clock",
        type: "Action",
        title: isClockedIn ? "Clock Out Now" : "Clock In Now",
        subtitle: isClockedIn ? "End your current working session" : "Record your attendance start time",
        icon: Clock,
        action: async () => {
          await checkInOut(isClockedIn ? "out" : "in", currentMember?.id || user?.id);
          setOpen(false);
        },
      },
      {
        id: "act-tasks",
        type: "Navigation",
        title: "Go to Tasks Kanban",
        subtitle: "View and organize tasks across pipeline",
        icon: CheckSquare,
        action: () => {
          router.push("/dashboard/tasks");
          setOpen(false);
        },
      },
      {
        id: "act-projects",
        type: "Navigation",
        title: "Go to Projects",
        subtitle: "Manage milestones and project status",
        icon: FolderKanban,
        action: () => {
          router.push("/dashboard/projects");
          setOpen(false);
        },
      },
      {
        id: "act-timeline",
        type: "Navigation",
        title: "Open Timeline (Gantt)",
        subtitle: "Schedule and project dependencies",
        icon: GanttChart,
        action: () => {
          router.push("/dashboard/timeline");
          setOpen(false);
        },
      },
      {
        id: "act-social",
        type: "Navigation",
        title: "Open Social & Events Calendar",
        subtitle: "Plan and review calendar items",
        icon: Calendar,
        action: () => {
          router.push("/dashboard/social");
          setOpen(false);
        },
      },
      ...(user?.role === "admin"
        ? [
            {
              id: "act-payout",
              type: "Navigation",
              title: "Trainee Payout Account",
              subtitle: "Review and disburse trainee task payouts",
              icon: Banknote,
              action: () => {
                router.push("/dashboard/account");
                setOpen(false);
              },
            },
            {
              id: "act-whatsapp",
              type: "Navigation",
              title: "WhatsApp Bot Integration",
              subtitle: "Configure group alerts and task ingestion",
              icon: MessageSquare,
              action: () => {
                router.push("/dashboard/whatsapp");
                setOpen(false);
              },
            },
          ]
        : []),
    ];

    if (!q) {
      return quickActions;
    }

    const matchedActions = quickActions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );

    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `task-${t.id}`,
        type: "Task",
        title: t.title,
        subtitle: `Status: ${t.status} · Priority: ${t.priority}`,
        icon: CheckSquare,
        action: () => {
          router.push(`/dashboard/tasks`);
          setOpen(false);
        },
      }));

    const matchedProjects = projects
      .filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({
        id: `proj-${p.id}`,
        type: "Project",
        title: p.name,
        subtitle: `${p.progress}% completed · ${p.status}`,
        icon: FolderKanban,
        action: () => {
          router.push(`/dashboard/projects/${p.id}`);
          setOpen(false);
        },
      }));

    const matchedMembers = members
      .filter((m) => m.name.toLowerCase().includes(q) || m.department.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))
      .slice(0, 4)
      .map((m) => ({
        id: `mem-${m.id}`,
        type: "Team Member",
        title: `${m.name} (${m.role})`,
        subtitle: `${m.department} · ${m.title}`,
        icon: Users,
        action: () => {
          router.push(`/dashboard/team`);
          setOpen(false);
        },
      }));

    const matchedMeetings = meetings
      .filter((m) => m.title.toLowerCase().includes(q))
      .slice(0, 3)
      .map((m) => ({
        id: `meet-${m.id}`,
        type: "Meeting",
        title: m.title,
        subtitle: `Room: ${m.roomName} · ${m.status}`,
        icon: Video,
        action: () => {
          router.push(`/dashboard/meetings`);
          setOpen(false);
        },
      }));

    return [...matchedActions, ...matchedTasks, ...matchedProjects, ...matchedMembers, ...matchedMeetings];
  }, [query, isClockedIn, tasks, projects, members, meetings, user, checkInOut, currentMember, router]);

  // Handle keyboard navigation inside items
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = items[selectedIndex];
      if (current) current.action();
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Header */}
              <div className="relative flex items-center border-b border-slate-100 px-4 py-3">
                <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command, task, project, or teammate... (ESC to close)"
                  className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    No results found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => item.action()}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {item.type}
                          </span>
                          <ArrowRight className={`h-3.5 w-3.5 ${isSelected ? "text-indigo-600" : "opacity-0"}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Command bar footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span>Use <kbd className="rounded border bg-white px-1 font-mono text-[10px] shadow-2xs">↑</kbd> <kbd className="rounded border bg-white px-1 font-mono text-[10px] shadow-2xs">↓</kbd> to navigate</span>
                  <span><kbd className="rounded border bg-white px-1 font-mono text-[10px] shadow-2xs">↵</kbd> to select</span>
                </div>
                <div className="flex items-center gap-1">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

