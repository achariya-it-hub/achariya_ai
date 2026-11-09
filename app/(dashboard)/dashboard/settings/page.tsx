"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-context";
import { useCRMStore } from "@/store/crm-store";
import { initials } from "@/lib/utils";
import {
  Settings,
  Building2,
  Palette,
  Layers,
  Users,
  LayoutGrid,
  Trophy,
  Award,
  Sparkles,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Crown,
  Star,
  Flame,
  UserPlus,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Edit3,
} from "lucide-react";

interface SbuItem {
  id: string;
  name: string;
  code: string;
  color: string;
  active: boolean;
}

interface ModuleItem {
  id: string;
  label: string;
  href: string;
  mobileTab?: boolean;
  enabled: boolean;
  roles: string[];
}

interface WorkspaceSettingsState {
  entityName: string;
  entitySubtitle: string;
  entityTagline: string;
  logoUrl: string;
  entityEmail: string;
  entityPhone: string;
  entityAddress: string;
  entityWebsite: string;
  colorScheme: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  sbuList: SbuItem[];
  modules: ModuleItem[];
  leaderboardConfig: {
    enabled: boolean;
    showOnDashboard: boolean;
    pointsPerCompleted: number;
    pointsPerOnTime: number;
    pointsPerUrgent: number;
    penaltyPerCorrection: number;
    manualBonusByUserId: Record<string, number>;
  };
  peakPerformersConfig: {
    enabled: boolean;
    showBannerOnDashboard: boolean;
    badgeTitle: string;
    periodLabel: string;
    featuredUserIds: string[];
    spotlightNotes: Record<string, string>;
  };
}

const COLOR_PRESETS = [
  {
    id: "navy-pink",
    name: "Digiventures Navy & Pink",
    primary: "#1A3A5C",
    accent: "#E91E63",
    secondary: "#4F46E5",
  },
  {
    id: "royal-indigo",
    name: "Royal Indigo & Violet",
    primary: "#1E1B4B",
    accent: "#6366F1",
    secondary: "#8B5CF6",
  },
  {
    id: "emerald-teal",
    name: "Emerald & Cyber Teal",
    primary: "#064E3B",
    accent: "#10B981",
    secondary: "#0D9488",
  },
  {
    id: "crimson-amber",
    name: "Crimson & Gold",
    primary: "#450A0A",
    accent: "#F43F5E",
    secondary: "#F59E0B",
  },
  {
    id: "violet-fuchsia",
    name: "Cosmic Violet & Fuchsia",
    primary: "#2E1065",
    accent: "#D946EF",
    secondary: "#9333EA",
  },
  {
    id: "slate-cyan",
    name: "Midnight Slate & Cyan",
    primary: "#0F172A",
    accent: "#06B6D4",
    secondary: "#3B82F6",
  },
];

const ROLES = ["admin", "manager", "member", "trainee"];

const DEPARTMENTS = [
  "Executive",
  "Engineering",
  "Design",
  "Media Production",
  "Content & Media",
  "Content Writing & Scripts",
  "Digital Marketing",
];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const members = useCRMStore((s) => s.members);
  const tasks = useCRMStore((s) => s.tasks);
  const load = useCRMStore((s) => s.load);
  const addMember = useCRMStore((s) => s.addMember);
  const updateMember = useCRMStore((s) => s.updateMember);
  const deleteMember = useCRMStore((s) => s.deleteMember);

  const [activeTab, setActiveTab] = useState<
    "entity" | "colors" | "sbu" | "users" | "modules" | "leaderboard" | "peak"
  >("entity");

  const [settings, setSettings] = useState<WorkspaceSettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  // SBU new item state
  const [newSbuName, setNewSbuName] = useState("");
  const [newSbuCode, setNewSbuCode] = useState("");
  const [newSbuColor, setNewSbuColor] = useState("#4F46E5");

  // New user form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserEmployeeId, setNewUserEmployeeId] = useState("");
  const [newUserRole, setNewUserRole] = useState<
    "admin" | "manager" | "member" | "trainee"
  >("member");
  const [newUserDept, setNewUserDept] = useState("Design");
  const [newUserTitle, setNewUserTitle] = useState("Creative Specialist");
  const [newUserPhone, setNewUserPhone] = useState("+91 98765 43220");
  const [newUserPassword, setNewUserPassword] = useState("demo123");
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    load();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, [load]);

  const showNotice = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const saveSettings = async (patch?: Partial<WorkspaceSettingsState>) => {
    if (!settings) return;
    setSaving(true);
    const payload = patch ? { ...settings, ...patch } : settings;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const updated = await res.json();
      setSettings(updated);
      try {
        localStorage.setItem("cwms_workspace_settings", JSON.stringify(updated));
        window.dispatchEvent(new Event("cwms-settings-updated"));
      } catch {}
      showNotice("ok", "Workspace settings saved & synced across Web and Mobile!");
    } catch (e: any) {
      showNotice("err", e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      const updated = await res.json();
      setSettings(updated);
      try {
        localStorage.setItem("cwms_workspace_settings", JSON.stringify(updated));
        window.dispatchEvent(new Event("cwms-settings-updated"));
      } catch {}
      showNotice("ok", "Restored default Digiventures workspace settings.");
    } catch {
      showNotice("err", "Could not reset settings");
    } finally {
      setSaving(false);
    }
  };

  // Compute live Leaderboard & Peak Performers rankings
  const leaderboardRows = useMemo(() => {
    const cfg = settings?.leaderboardConfig || {
      pointsPerCompleted: 10,
      pointsPerOnTime: 5,
      pointsPerUrgent: 5,
      penaltyPerCorrection: 2,
      manualBonusByUserId: {},
    };

    return members
      .map((m) => {
        const userTasks = tasks.filter((t) => t.assigneeId === m.id);
        const completed = userTasks.filter(
          (t) => t.status === "done" || t.workflowState === "completed"
        );
        const inProgress = userTasks.filter(
          (t) => t.status === "in-progress" || t.workflowState === "in-progress"
        );
        const urgentDone = completed.filter(
          (t) => t.priority === "urgent" || t.priority === "high"
        );
        const onTimeDone = completed.filter((t) => {
          if (!t.dueDate) return true;
          const comp = t.completedAt ? new Date(t.completedAt) : new Date();
          const due = new Date(`${t.dueDate}T23:59:59`);
          return comp <= due;
        });
        const corrections = userTasks.filter(
          (t) =>
            t.workflowState === "correction-required" ||
            t.workflowState === "correction-submitted"
        );
        const manualBonus = Number(cfg.manualBonusByUserId?.[m.id] || 0);

        const points =
          completed.length * (cfg.pointsPerCompleted || 10) +
          onTimeDone.length * (cfg.pointsPerOnTime || 5) +
          urgentDone.length * (cfg.pointsPerUrgent || 5) -
          corrections.length * (cfg.penaltyPerCorrection || 2) +
          manualBonus;

        const completionRate =
          userTasks.length > 0
            ? Math.round((completed.length / userTasks.length) * 100)
            : 0;

        return {
          member: m,
          totalTasks: userTasks.length,
          completedCount: completed.length,
          inProgressCount: inProgress.length,
          onTimeCount: onTimeDone.length,
          urgentCount: urgentDone.length,
          correctionsCount: corrections.length,
          completionRate,
          manualBonus,
          score: Math.max(0, points),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.completedCount - a.completedCount ||
          b.completionRate - a.completionRate
      );
  }, [members, tasks, settings?.leaderboardConfig]);

  const peakUsers = useMemo(() => {
    const featuredIds = settings?.peakPerformersConfig?.featuredUserIds || [];
    if (featuredIds.length > 0) {
      return leaderboardRows.filter((r) => featuredIds.includes(r.member.id));
    }
    return leaderboardRows.slice(0, 3);
  }, [leaderboardRows, settings?.peakPerformersConfig?.featuredUserIds]);

  const handleAddSbu = () => {
    if (!settings || !newSbuName.trim()) return;
    const code =
      newSbuCode.trim().toUpperCase() ||
      newSbuName.trim().slice(0, 3).toUpperCase();
    const nextList: SbuItem[] = [
      ...settings.sbuList,
      {
        id: `sbu-${Date.now()}`,
        name: newSbuName.trim(),
        code,
        color: newSbuColor,
        active: true,
      },
    ];
    setSettings({ ...settings, sbuList: nextList });
    setNewSbuName("");
    setNewSbuCode("");
    saveSettings({ sbuList: nextList });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    setAddingUser(true);
    try {
      const cleanEmail = newUserEmail.trim().includes("@")
        ? `${newUserEmail.trim().split("@")[0].toLowerCase()}@achariya.ai`
        : `${newUserName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")}@achariya.ai`;

      await addMember({
        name: newUserName.trim(),
        email: cleanEmail,
        employeeId:
          newUserEmployeeId.trim() ||
          `${newUserRole === "trainee" ? "TRN" : "EMP"}-${Math.floor(
            100 + Math.random() * 900
          )}`,
        role: newUserRole,
        department: newUserDept,
        title: newUserTitle.trim() || "Creative Specialist",
        phone: newUserPhone.trim(),
        password: newUserPassword.trim() || "demo123",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          newUserName.trim()
        )}`,
        joinDate: new Date().toISOString().slice(0, 10),
        status: "active",
      } as any);

      setNewUserName("");
      setNewUserEmail("");
      setNewUserEmployeeId("");
      showNotice("ok", `Added ${newUserName.trim()} (${cleanEmail}) to workspace!`);
    } catch (err: any) {
      showNotice("err", err?.message || "Could not create user");
    } finally {
      setAddingUser(false);
    }
  };

  if (!settings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-600 font-semibold">
          <Settings className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Loading Admin Control Center...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "entity", label: "1. Entity & Logo", icon: Building2 },
    { id: "colors", label: "2. Color Scheme", icon: Palette },
    { id: "sbu", label: "3. SBU Names", icon: Layers },
    { id: "users", label: "4. Users (@achariya.ai)", icon: Users },
    { id: "modules", label: "5. Modules Visibility", icon: LayoutGrid },
    { id: "leaderboard", label: "6. User Leaderboard", icon: Trophy },
    { id: "peak", label: "7. Peak Performers", icon: Award },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* HERO COMMAND BANNER */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 65%, ${settings.accentColor} 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.entityName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Settings className="h-7 w-7 text-white" />
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Admin Master Control Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {settings.entityName} — System Settings
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                Configure entity branding, theme colors, SBUs, users, module visibility, leaderboard, and peak performers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={resetDefaults}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={() => saveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-xs font-extrabold shadow-lg transition-all cursor-pointer"
            >
              <Save className="h-4 w-4 text-pink-600" />
              <span>{saving ? "Saving..." : "Save & Sync All Changes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {toast && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold border shadow-sm ${
            toast.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 7-TAB NAVIGATION BAR */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 border border-slate-200/80 shadow-2xs">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              style={
                active
                  ? {
                      background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ENTITY NAME, LOGO, DETAILS */}
      {activeTab === "entity" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-2xs flex flex-col items-center text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Live Sidebar & Header Preview
            </p>
            <div
              className="w-full rounded-2xl p-5 text-white shadow-lg flex items-center gap-3.5 text-left"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <img
                src={settings.logoUrl || "/logo.png"}
                alt={settings.entityName}
                className="h-12 w-12 rounded-xl object-cover bg-white/10 shrink-0 border border-white/20"
              />
              <div className="min-w-0">
                <h3 className="text-base font-extrabold truncate">
                  {settings.entityName || "Digiventures"}
                </h3>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest truncate"
                  style={{ color: settings.accentColor }}
                >
                  {settings.entitySubtitle || "CREATIVE WORKFLOW OS"}
                </p>
                <p className="text-[11px] text-white/70 truncate mt-0.5">
                  {settings.entityTagline}
                </p>
              </div>
            </div>

            <div className="w-full mt-5 pt-5 border-t border-slate-100 text-left space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Official Email:</span>
                <span className="font-bold text-slate-800">{settings.entityEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Phone:</span>
                <span className="font-bold text-slate-800">{settings.entityPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Website:</span>
                <span className="font-bold text-indigo-600">{settings.entityWebsite}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900">
              1. Entity Identity, Logo & Organization Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entity / Organization Name *
                </label>
                <input
                  type="text"
                  value={settings.entityName}
                  onChange={(e) =>
                    setSettings({ ...settings, entityName: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entity Subtitle / OS Badge
                </label>
                <input
                  type="text"
                  value={settings.entitySubtitle}
                  onChange={(e) =>
                    setSettings({ ...settings, entitySubtitle: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Logo URL (or path like `/logo.png`)
                </label>
                <input
                  type="text"
                  value={settings.logoUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, logoUrl: e.target.value })
                  }
                  placeholder="/logo.png or https://..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Workspace Tagline / Description
                </label>
                <input
                  type="text"
                  value={settings.entityTagline}
                  onChange={(e) =>
                    setSettings({ ...settings, entityTagline: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Support / Operations Email
                </label>
                <input
                  type="email"
                  value={settings.entityEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, entityEmail: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={settings.entityPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, entityPhone: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Headquarters Address
                </label>
                <input
                  type="text"
                  value={settings.entityAddress}
                  onChange={(e) =>
                    setSettings({ ...settings, entityAddress: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Website
                </label>
                <input
                  type="text"
                  value={settings.entityWebsite}
                  onChange={(e) =>
                    setSettings({ ...settings, entityWebsite: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => saveSettings()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-md cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save Entity Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLOR SCHEME */}
      {activeTab === "colors" && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              2. Workspace Color Scheme & Brand Palette
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose a curated theme preset or customize primary, accent, and secondary hex colors for the sidebar, banners, and mobile app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLOR_PRESETS.map((preset) => {
              const selected = settings.colorScheme === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    const patch = {
                      colorScheme: preset.id,
                      primaryColor: preset.primary,
                      accentColor: preset.accent,
                      secondaryColor: preset.secondary,
                    };
                    setSettings({ ...settings, ...patch });
                    saveSettings(patch);
                  }}
                  className={`group rounded-2xl p-4 border text-left transition-all cursor-pointer ${
                    selected
                      ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-slate-900">
                      {preset.name}
                    </span>
                    {selected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <div
                    className="h-14 rounded-xl p-3 flex items-center justify-between shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 60%, ${preset.accent} 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-white/40"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-white/40"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-white/40"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/90">
                      {preset.primary}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Sidebar / Command Color
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      colorScheme: "custom",
                      primaryColor: e.target.value,
                    })
                  }
                  className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      colorScheme: "custom",
                      primaryColor: e.target.value,
                    })
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Accent Highlight Color
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      colorScheme: "custom",
                      accentColor: e.target.value,
                    })
                  }
                  className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      colorScheme: "custom",
                      accentColor: e.target.value,
                    })
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Secondary Gradient Color
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      colorScheme: "custom",
                      secondaryColor: e.target.value,
                    })
                  }
                  className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      colorScheme: "custom",
                      secondaryColor: e.target.value,
                    })
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => saveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-md cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Apply Color Scheme</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CREATE OR EDIT SBU NAMES */}
      {activeTab === "sbu" && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                3. Strategic Business Units (SBU) Manager
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Create new SBUs, rename existing SBU entities, customize badge colors, or toggle active status.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
              {settings.sbuList.length} SBUs Configured
            </span>
          </div>

          {/* Add new SBU bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                New SBU Name *
              </label>
              <input
                type="text"
                value={newSbuName}
                onChange={(e) => setNewSbuName(e.target.value)}
                placeholder="e.g. Achariya Global Online"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Short Code
              </label>
              <input
                type="text"
                value={newSbuCode}
                onChange={(e) => setNewSbuCode(e.target.value)}
                placeholder="e.g. AGO"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Badge Color
              </label>
              <input
                type="color"
                value={newSbuColor}
                onChange={(e) => setNewSbuColor(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white cursor-pointer"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleAddSbu}
                className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add SBU</span>
              </button>
            </div>
          </div>

          {/* Existing SBU editable rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settings.sbuList.map((sbu, idx) => (
              <div
                key={sbu.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 bg-white hover:border-slate-300 transition-all"
              >
                <input
                  type="color"
                  value={sbu.color}
                  onChange={(e) => {
                    const next = [...settings.sbuList];
                    next[idx] = { ...sbu, color: e.target.value };
                    setSettings({ ...settings, sbuList: next });
                  }}
                  className="h-9 w-9 rounded-xl border border-slate-200 shrink-0 cursor-pointer"
                />
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={sbu.name}
                    onChange={(e) => {
                      const next = [...settings.sbuList];
                      next[idx] = { ...sbu, name: e.target.value };
                      setSettings({ ...settings, sbuList: next });
                    }}
                    className="col-span-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                  <input
                    type="text"
                    value={sbu.code}
                    onChange={(e) => {
                      const next = [...settings.sbuList];
                      next[idx] = {
                        ...sbu,
                        code: e.target.value.toUpperCase(),
                      };
                      setSettings({ ...settings, sbuList: next });
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono font-bold text-slate-700 uppercase"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...settings.sbuList];
                    next[idx] = { ...sbu, active: !sbu.active };
                    setSettings({ ...settings, sbuList: next });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase cursor-pointer ${
                    sbu.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {sbu.active ? "Active" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = settings.sbuList.filter((x) => x.id !== sbu.id);
                    setSettings({ ...settings, sbuList: next });
                    saveSettings({ sbuList: next });
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Delete SBU"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => saveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-md cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save SBU Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: ADD OR REMOVE USERS */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Add User Card */}
          <form
            onSubmit={handleCreateUser}
            className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  4. Add New Workspace User (`@achariya.ai`)
                </h2>
                <p className="text-xs text-slate-500">
                  Create a new admin, manager, member, or trainee account synced to the database.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Karthik Raja"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email (`@achariya.ai`)
                </label>
                <input
                  type="text"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="karthik@achariya.ai"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={newUserEmployeeId}
                  onChange={(e) => setNewUserEmployeeId(e.target.value)}
                  placeholder="EMP-006"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                  <option value="trainee">Trainee</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Designation / Title
                </label>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-semibold"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingUser}
                  className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{addingUser ? "Adding..." : "Create User"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Existing Users Roster Table */}
          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Active Workspace Users ({members.length})
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                All emails standardized on `@achariya.ai`
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Email (`@achariya.ai`)</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Department & Title</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {initials(m.name)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">
                              {m.name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {m.employeeId || m.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-600">
                        {m.email}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={m.role}
                          onChange={(e) => {
                            updateMember(m.id, { role: e.target.value as any });
                            showNotice(
                              "ok",
                              `Updated ${m.name}'s role to ${e.target.value}`
                            );
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold uppercase text-slate-800"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{m.department}</p>
                        <p className="text-[11px] text-slate-500">{m.title}</p>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            if (m.id === user?.id) {
                              showNotice(
                                "err",
                                "You cannot remove your own currently logged-in admin account."
                              );
                              return;
                            }
                            await deleteMember(m.id);
                            showNotice("ok", `Removed ${m.name} from workspace.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CHANGE ANY MODULES DISPLAYED TO USERS */}
      {activeTab === "modules" && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                5. Navigation Modules & Role Visibility Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Control which modules are visible in the sidebar and mobile navigation bar, and customize which roles can access each module.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-md cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Module Visibility</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {settings.modules.map((mod, idx) => (
              <div
                key={mod.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...settings.modules];
                      next[idx] = { ...mod, enabled: !mod.enabled };
                      setSettings({ ...settings, modules: next });
                    }}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                      mod.enabled
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                    title={mod.enabled ? "Module Enabled" : "Module Hidden"}
                  >
                    {mod.enabled ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mod.label}
                        onChange={(e) => {
                          const next = [...settings.modules];
                          next[idx] = { ...mod, label: e.target.value };
                          setSettings({ ...settings, modules: next });
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-extrabold text-slate-900"
                      />
                      {mod.mobileTab && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                          Web + Mobile Tab
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {mod.href}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">
                    Visible to Roles:
                  </span>
                  {ROLES.map((roleName) => {
                    const hasRole = mod.roles.includes(roleName);
                    return (
                      <button
                        key={roleName}
                        type="button"
                        onClick={() => {
                          const nextRoles = hasRole
                            ? mod.roles.filter((r) => r !== roleName)
                            : [...mod.roles, roleName];
                          const next = [...settings.modules];
                          next[idx] = { ...mod, roles: nextRoles };
                          setSettings({ ...settings, modules: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                          hasRole
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {roleName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: LEADERBOARD FOR USERS */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Scoring formula & toggle bar */}
          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  6. Organization User Leaderboard & Scoring Engine
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize point weights for completed tasks, on-time delivery, urgent priorities, and award manual bonus points.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.leaderboardConfig.showOnDashboard}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        leaderboardConfig: {
                          ...settings.leaderboardConfig,
                          showOnDashboard: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>Show Leaderboard on Dashboard</span>
                </label>
                <button
                  type="button"
                  onClick={() => saveSettings()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Weights</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70">
                <label className="block text-[11px] font-bold text-slate-500">
                  Points / Completed Task
                </label>
                <input
                  type="number"
                  value={settings.leaderboardConfig.pointsPerCompleted}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaderboardConfig: {
                        ...settings.leaderboardConfig,
                        pointsPerCompleted: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-indigo-600"
                />
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70">
                <label className="block text-[11px] font-bold text-slate-500">
                  On-Time Delivery Bonus
                </label>
                <input
                  type="number"
                  value={settings.leaderboardConfig.pointsPerOnTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaderboardConfig: {
                        ...settings.leaderboardConfig,
                        pointsPerOnTime: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-emerald-600"
                />
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70">
                <label className="block text-[11px] font-bold text-slate-500">
                  High / Urgent Priority Bonus
                </label>
                <input
                  type="number"
                  value={settings.leaderboardConfig.pointsPerUrgent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaderboardConfig: {
                        ...settings.leaderboardConfig,
                        pointsPerUrgent: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-amber-600"
                />
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70">
                <label className="block text-[11px] font-bold text-slate-500">
                  Correction Penalty
                </label>
                <input
                  type="number"
                  value={settings.leaderboardConfig.penaltyPerCorrection}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaderboardConfig: {
                        ...settings.leaderboardConfig,
                        penaltyPerCorrection: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Live Ranked Leaderboard Table */}
          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Live User Standings ({leaderboardRows.length} Users)
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Adjust manual bonus points inline to recognize extra contributions
              </span>
            </div>

            <div className="space-y-2.5">
              {leaderboardRows.map((row, index) => {
                const rank = index + 1;
                const badgeColor =
                  rank === 1
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30"
                    : rank === 2
                    ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                    : rank === 3
                    ? "bg-gradient-to-br from-orange-400 to-amber-700 text-white"
                    : "bg-slate-100 text-slate-700";

                return (
                  <div
                    key={row.member.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 border transition-all ${
                      rank <= 3
                        ? "bg-gradient-to-r from-amber-50/40 via-white to-indigo-50/30 border-amber-200/80"
                        : "bg-white border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`h-9 w-9 rounded-xl font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0 ${badgeColor}`}
                      >
                        #{rank}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                        {initials(row.member.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-slate-900">
                            {row.member.name}
                          </p>
                          {rank === 1 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                              <Crown className="h-3 w-3 text-amber-600" /> Champion
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {row.member.title || row.member.role} · {row.member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-center px-2">
                        <p className="text-xs font-extrabold text-emerald-600">
                          {row.completedCount}/{row.totalTasks}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          Completed ({row.completionRate}%)
                        </p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-xs font-extrabold text-indigo-600">
                          {row.onTimeCount}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          On-Time
                        </p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-xs font-extrabold text-amber-600">
                          {row.urgentCount}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          High/Urgent
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Bonus:
                        </span>
                        <input
                          type="number"
                          value={row.manualBonus}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSettings({
                              ...settings,
                              leaderboardConfig: {
                                ...settings.leaderboardConfig,
                                manualBonusByUserId: {
                                  ...settings.leaderboardConfig
                                    .manualBonusByUserId,
                                  [row.member.id]: val,
                                },
                              },
                            });
                          }}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs font-extrabold text-center text-pink-600"
                        />
                      </div>
                      <div className="min-w-[82px] text-right rounded-xl bg-slate-900 px-3 py-1.5 text-white">
                        <p className="text-sm font-extrabold">{row.score} pts</p>
                        <p className="text-[9px] uppercase tracking-wider text-white/60">
                          Total Score
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PEAK PERFORMED USERS */}
      {activeTab === "peak" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  7. Peak Performed Users Spotlight
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highlight your peak performers on the Dashboard with custom recognition titles and appreciation notes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.peakPerformersConfig.showBannerOnDashboard}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        peakPerformersConfig: {
                          ...settings.peakPerformersConfig,
                          showBannerOnDashboard: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>Show Peak Performers on Dashboard</span>
                </label>
                <button
                  type="button"
                  onClick={() => saveSettings()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Spotlight</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recognition Badge Title
                </label>
                <input
                  type="text"
                  value={settings.peakPerformersConfig.badgeTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      peakPerformersConfig: {
                        ...settings.peakPerformersConfig,
                        badgeTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Performance Period Label
                </label>
                <input
                  type="text"
                  value={settings.peakPerformersConfig.periodLabel}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      peakPerformersConfig: {
                        ...settings.peakPerformersConfig,
                        periodLabel: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold"
                />
              </div>
            </div>

            {/* Live Preview of Peak Performers Spotlight Podium */}
            <div className="rounded-3xl bg-gradient-to-r from-[#1A3A5C] via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    {settings.peakPerformersConfig.badgeTitle} ·{" "}
                    {settings.peakPerformersConfig.periodLabel}
                  </span>
                </div>
                <span className="text-[11px] text-white/60">
                  {settings.peakPerformersConfig.featuredUserIds.length === 0
                    ? "Auto-selecting Top 3 by Score (or click stars below to pin)"
                    : `${settings.peakPerformersConfig.featuredUserIds.length} Pinned Peak Performers`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {peakUsers.map((p, idx) => (
                  <div
                    key={p.member.id}
                    className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                          {initials(p.member.name)}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-white">
                            {p.member.name}
                          </p>
                          <p className="text-[11px] text-indigo-200">
                            {p.member.title || p.member.department}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300">
                        #{idx + 1} · {p.score} pts
                      </span>
                    </div>

                    <p className="text-xs text-white/80 italic mt-3">
                      &ldquo;
                      {settings.peakPerformersConfig.spotlightNotes?.[
                        p.member.id
                      ] ||
                        `Outstanding creative velocity with ${p.completedCount} tasks completed (${p.completionRate}% completion rate).`}
                      &rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Select / Pin Peak Performers & Custom Notes */}
            <div className="space-y-2.5 pt-2">
              <p className="text-xs font-extrabold text-slate-700">
                Pin Specific Peak Performers & Add Appreciation Notes:
              </p>
              {leaderboardRows.map((row) => {
                const isPinned =
                  settings.peakPerformersConfig.featuredUserIds.includes(
                    row.member.id
                  );
                return (
                  <div
                    key={row.member.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-slate-200 p-3.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const cur =
                          settings.peakPerformersConfig.featuredUserIds;
                        const next = isPinned
                          ? cur.filter((id) => id !== row.member.id)
                          : [...cur, row.member.id];
                        setSettings({
                          ...settings,
                          peakPerformersConfig: {
                            ...settings.peakPerformersConfig,
                            featuredUserIds: next,
                          },
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                        isPinned
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          isPinned ? "fill-white" : ""
                        }`}
                      />
                      <span>{isPinned ? "Peak Performer" : "Select"}</span>
                    </button>

                    <div className="min-w-[170px]">
                      <p className="text-xs font-extrabold text-slate-900">
                        {row.member.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {row.completedCount} done · {row.score} pts
                      </p>
                    </div>

                    <input
                      type="text"
                      value={
                        settings.peakPerformersConfig.spotlightNotes?.[
                          row.member.id
                        ] || ""
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          peakPerformersConfig: {
                            ...settings.peakPerformersConfig,
                            spotlightNotes: {
                              ...settings.peakPerformersConfig.spotlightNotes,
                              [row.member.id]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Custom appreciation note for this user..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
