"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-context";
import { useCRMStore } from "@/store/crm-store";
import { initials } from "@/lib/utils";
import { getTaskStage } from "@/lib/task-workflow";
import {
  UserCog,
  Mail,
  Phone,
  Briefcase,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

const DEPARTMENTS = [
  "Management",
  "Digital Marketing",
  "Creative Design",
  "Content & Copy",
  "Video Production",
  "Social Media",
  "Operations",
];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const members = useCRMStore((s) => s.members);
  const tasks = useCRMStore((s) => s.tasks);
  const updateMember = useCRMStore((s) => s.updateMember);

  const member = members.find(
    (m) => m.id === user?.id || m.email.toLowerCase() === (user?.email || "").toLowerCase()
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Creative Design");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user || member) {
      setName(member?.name || user?.name || "");
      setEmail(member?.email || user?.email || "");
      setPhone(member?.phone || user?.phone || "");
      setDepartment(member?.department || user?.department || "Creative Design");
      setTitle(member?.title || user?.title || "Creative Specialist");
      setAvatar(member?.avatar || user?.avatar || "");
    }
  }, [user?.id, member?.id]);

  const myTasks = tasks.filter(
    (t) => t.assigneeId === (member?.id || user?.id)
  );
  const completedCount = myTasks.filter((t) => {
    const st = getTaskStage(t);
    return t.status === "done" || st === "completed" || st === "approved";
  }).length;
  const activeCount = myTasks.length - completedCount;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !email.trim()) {
      setErrorMsg("Full Name and Email Address are required.");
      return;
    }

    if (newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        setErrorMsg("New password must be at least 4 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("New password and confirmation do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      const targetId = member?.id || user?.id || "1";
      const payload = {
        id: targetId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department.trim(),
        title: title.trim(),
        avatar: avatar.trim(),
        ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
      };

      const res = await updateProfile(payload);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        await updateMember(targetId, {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          department: payload.department,
          title: payload.title,
          avatar: payload.avatar,
        });
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMsg("Your profile has been updated and synced across all devices.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Digiventures Hero Command Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A3A5C] via-[#1F3E68] to-[#2B2A5A] p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-pink-500/15 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-indigo-200 ring-1 ring-white/15 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>Personal Workspace Identity</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Profile & Account Settings
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Update your name, contact details, department, and credentials synced across Web and Mobile.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-lg font-extrabold text-white shadow-md overflow-hidden">
              {avatar ? (
                <img src={avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                initials(name || user?.name || "U")
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{name || user?.name}</p>
              <p className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">
                {user?.role || member?.role || "member"} · {member?.employeeId || `EMP-00${user?.id || 1}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#1A3A5C] via-indigo-600 to-pink-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg overflow-hidden mb-4">
                {avatar ? (
                  <img src={avatar} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initials(name || user?.name || "U")
                )}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">{name || user?.name}</h2>
              <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                {title || "Creative Specialist"} · {department}
              </p>
              <p className="text-xs text-slate-500 mt-1">{email || user?.email}</p>

              <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-5 border-t border-slate-100">
                <div className="rounded-2xl bg-indigo-50/70 p-3 text-center">
                  <p className="text-xl font-extrabold text-indigo-700">{activeCount}</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Active Tasks
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50/70 p-3 text-center">
                  <p className="text-xl font-extrabold text-emerald-700">{completedCount}</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Edit Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSave}
            className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6"
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Personal & Role Details
                </h2>
                <p className="text-xs text-slate-500">
                  Changes made here sync automatically to the database and mobile app.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <UserCog className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="name@achariya.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Designation / Title
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Senior Graphic Designer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Avatar URL (Optional)
                </label>
                <div className="relative">
                  <ImageIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Optional Password Update */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="h-4 w-4 text-pink-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Update Password (Optional — leave blank to keep current)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="At least 4 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1A3A5C] via-indigo-600 to-pink-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 disabled:opacity-60 transition-all"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving Profile..." : "Save Profile Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
