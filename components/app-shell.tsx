"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-context";
import { useCRMStore } from "@/store/crm-store";
import { initials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  GanttChart,
  Video,
  Users,
  BarChart3,
  Clock,
  Banknote,
  LogOut,
  Menu,
  X,
  ChevronRight,
  MessageSquare,
  Calendar,
  MessageCircle,
  KeyRound,
  ChevronsUpDown,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Plus,
  Gauge,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "@/components/notifications-popover";

const navItems = [
  { href: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/account", label: "Trainee Payouts", icon: Banknote, roles: ["admin"] },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckCircle2, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/workload", label: "Workload", icon: Gauge, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/productivity", label: "Analytics", icon: BarChart3, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/timeline", label: "Timeline", icon: GanttChart, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/whatsapp", label: "WhatsApp Integration", icon: MessageSquare, roles: ["admin"] },
  { href: "/dashboard/team", label: "Team", icon: Users, roles: ["admin", "manager"] },
  { href: "/dashboard/meetings", label: "Meetings", icon: Video, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/social", label: "Calendar", icon: Calendar, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: Clock, roles: ["admin", "manager", "member", "trainee"] },
  { href: "/dashboard/chat", label: "Peer Chat", icon: MessageCircle, roles: ["admin", "manager", "member", "trainee"] },
];

function NavItem({ href, label, icon: Icon, active, badge }: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/25"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-white/50 group-hover:text-white")} />
      <span>{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="ml-auto flex items-center justify-center rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          {badge}
        </span>
      )}
      {active && !badge && (
        <ChevronRight className="ml-auto h-4 w-4 text-white/70" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const members = useCRMStore((s) => s.members);
  const tasks = useCRMStore((s) => s.tasks);
  const socialPosts = useCRMStore((s) => s.socialPosts || []);
  const pendingSocialCount = socialPosts.filter((p) => !p.isProcessed && p.status !== "published" && p.status !== "archived").length;
  const pendingApprovalsCount = tasks.filter(
    (t) =>
      t.workflowState !== "cancelled" &&
      t.workflowState !== "rejected" &&
      (t.status === "review" ||
        t.workflowState === "awaiting-approval" ||
        t.workflowState === "in-review" ||
        t.workflowState === "correction-submitted")
  ).length;
  const member = members.find((m) => m.email === user?.email);
  const role = user?.role || member?.role || "trainee";
  const userTasks = tasks.filter((t) => t.assigneeId === (user?.id || member?.id));
  const userEarnedPayout = role === "trainee" ? userTasks.filter((t) => t.status === "done").reduce((sum, t) => sum + (t.payout || 0), 0) : 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  const isAdmin = role === "admin";
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.trim().length < 4) {
      setPasswordError("New password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSuccess("Password updated successfully!");
        setTimeout(() => {
          setChangePasswordOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordSuccess("");
        }, 1200);
      }
    } catch {
      setPasswordError("An unexpected error occurred. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#1A3A5C] border-r border-white/10 w-64">
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="Digiventures" className="h-9 w-9 rounded-xl object-cover shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white truncate">
              Digiventures
            </h1>
            <p className="text-[10px] text-white/50 font-medium truncate">CRM & Workspace</p>
          </div>
        </div>
        <NotificationsPopover />
      </div>

      {/* Quick Search / Command Bar Trigger */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs font-medium transition-all group border border-white/10"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-white/50 group-hover:text-white" />
            <span>Search / Commands</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-white/60">
            Ctrl+K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            badge={
              item.href === "/dashboard/social"
                ? pendingSocialCount
                : item.href === "/dashboard/approvals"
                ? pendingApprovalsCount
                : undefined
            }
            active={
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
              (item.href === "/dashboard/productivity" &&
                pathname.startsWith("/dashboard/analytics"))
            }
          />
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Quick actions
          </p>
          <Link
            href="/dashboard/tasks/new"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            <span>New task</span>
          </Link>
        </div>
      </nav>

      {/* User profile section with menu & actions */}
      <div className="relative border-t border-white/10 p-3" ref={menuRef}>
        {/* Floating Profile Action Menu */}
        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-3 right-3 mb-2 z-50 rounded-2xl bg-[#152e4a] p-2 shadow-2xl border border-white/20 backdrop-blur-xl"
            >
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white/80 border border-white/15">
                    {member?.employeeId || user?.id.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-white/60 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {role}
                  </span>
                  <span className="text-[9px] text-white/50 font-mono">
                    ID: {member?.employeeId || user?.id.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setPasswordError("");
                  setPasswordSuccess("");
                  setChangePasswordOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
              >
                <KeyRound className="h-4 w-4 text-pink-400 shrink-0" />
                <span>Change Password</span>
              </button>

              {isAdmin && (
                <Link
                  href="/dashboard/account"
                  onClick={() => setProfileMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                >
                  <Banknote className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Trainee Payouts</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card Button */}
        <button
          type="button"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className={cn(
            "w-full flex items-center gap-3 group rounded-xl p-2 transition-all text-left",
            profileMenuOpen ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/10"
          )}
          title="Click for Profile options, Password & Logout"
        >
          <Avatar className="h-9 w-9 ring-2 ring-pink-500/30 shrink-0">
            <AvatarImage src={member?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-pink-600 text-white text-xs font-semibold">
              {member ? initials(member.name) : initials(user?.name || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-pink-300 transition-colors">
              {user?.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/15 text-pink-300">
                {role}
              </span>
              {role === "trainee" && userEarnedPayout > 0 && (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  ₹{userEarnedPayout.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-white/40 group-hover:text-white/80 shrink-0 transition-colors" />
        </button>

        {/* Quick-action buttons underneath */}
        <div className="mt-2 flex items-center justify-between px-1">
          <button
            onClick={() => {
              setPasswordError("");
              setPasswordSuccess("");
              setChangePasswordOpen(true);
            }}
            className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-pink-300 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors font-medium"
            title="Change password"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Password</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-red-400 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors font-medium"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A3A5C] shadow-lg border border-white/10 lg:hidden"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-10 rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 shadow"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="hidden lg:block h-full">{sidebar}</div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white">
          <div className="bg-gradient-to-br from-[#1A3A5C] via-[#152e4a] to-slate-900 p-6 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 mb-3 shadow-inner">
              <KeyRound className="h-5 w-5 text-pink-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">Change Password</DialogTitle>
            <p className="text-xs text-white/60 mt-1">
              Update password for <span className="text-pink-300 font-semibold">{user?.email}</span>
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {passwordError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-700">Current Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="text-xs pr-9 h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  required
                  className="text-xs pr-9 h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Confirm New Password</Label>
              <Input
                type={showNewPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="text-xs mt-1.5 h-10"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePasswordOpen(false)}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={passwordLoading}
                className="bg-gradient-to-r from-pink-500 to-indigo-600 text-white hover:from-pink-600 hover:to-indigo-700 shadow-md font-semibold"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
