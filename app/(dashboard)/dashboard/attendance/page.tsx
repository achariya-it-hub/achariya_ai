"use client";

import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon3D } from "@/components/icon-3d";
import { initials } from "@/lib/utils";
import { Clock, LogIn, LogOut, Users } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function timeLabel(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(ms: number) {
  if (!ms || ms <= 0) return "0h 0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function isToday(value: string | Date) {
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function AttendancePage() {
  const { user } = useAuth();
  const members = useCRMStore((s) => s.members);
  const attendance = useCRMStore((s) => s.attendance);
  const checkInOut = useCRMStore((s) => s.checkInOut);
  const load = useCRMStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isManager = user?.role === "admin" || user?.role === "manager";
  const currentMember = members.find((m) => m.email === user?.email);

  const openRecordFor = (userId?: string) =>
    userId ? attendance.find((a) => a.userId === userId && !a.clockOutAt) : undefined;

  const myOpen = openRecordFor(currentMember?.id);

  const todayStats = useMemo(() => {
    const rows: Record<string, { worked: number; open: boolean; clockIn?: string }> = {};
    members.forEach((m) => { rows[m.id] = { worked: 0, open: false }; });
    attendance.forEach((a) => {
      if (!isToday(a.clockInAt)) return;
      if (!rows[a.userId]) rows[a.userId] = { worked: 0, open: false };
      const open = !a.clockOutAt;
      if (open) {
        rows[a.userId].open = true;
        rows[a.userId].clockIn = a.clockInAt;
        rows[a.userId].worked += now.getTime() - new Date(a.clockInAt).getTime();
      } else if (a.clockOutAt) {
        rows[a.userId].worked += new Date(a.clockOutAt).getTime() - new Date(a.clockInAt).getTime();
      }
    });
    return rows;
  }, [attendance, members, now]);

  async function handleToggle(memberId?: string) {
    const isOpen = memberId ? !!openRecordFor(memberId) : !!myOpen;
    setBusyId(memberId || "self");
    setError(null);
    const result = await checkInOut(isOpen ? "out" : "in", memberId);
    if (result.error) setError(result.error);
    setBusyId(null);
  }

  const enrolledMembers = members.filter((m) => m.status === "active" && m.attendanceEnabled !== false);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 mt-1">Clock in and out, and monitor the team&apos;s attendance status.</p>
      </motion.div>

      {error && (
        <motion.div variants={item}>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-slate-500 font-medium">Good day, {user?.name?.split(" ")?.[0]}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <Icon3D gradient={myOpen ? "green" : "indigo"} size="md">
                      <Clock className="h-6 w-6" />
                    </Icon3D>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {myOpen ? `Clocked in at ${timeLabel(myOpen.clockInAt)}` : "Not clocked in"}
                      </p>
                      <p className="text-xs text-slate-400">Today&apos;s hours: {currentMember ? durationLabel(todayStats[currentMember.id]?.worked || 0) : "0h 0m"}</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleToggle(currentMember?.id)}
                  disabled={!currentMember || busyId === "self"}
                  className={myOpen
                    ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 px-8 py-6 text-base"
                    : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 px-8 py-6 text-base"}
                >
                  {myOpen ? <><LogOut className="h-5 w-5 mr-2" />Clock Out</> : <><LogIn className="h-5 w-5 mr-2" />Clock In</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-md bg-white h-full">
            <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" />Today</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="text-sm text-emerald-700 font-medium">Clocked in now</span>
                <span className="text-xl font-bold text-emerald-700">{enrolledMembers.filter((m) => todayStats[m.id]?.open).length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600 font-medium">Attendance enabled</span>
                <span className="text-xl font-bold text-slate-700">{enrolledMembers.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
                <span className="text-sm text-indigo-700 font-medium">Total members</span>
                <span className="text-xl font-bold text-indigo-700">{members.length}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {isManager && (
        <motion.div variants={item}>
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800">Team Attendance</CardTitle>
              <Badge variant="secondary">{enrolledMembers.length} enabled</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-medium">Member</th>
                      <th className="pb-3 font-medium px-2">Status</th>
                      <th className="pb-3 font-medium px-2 hidden sm:table-cell">Clocked In</th>
                      <th className="pb-3 font-medium px-2 hidden sm:table-cell">Hours Today</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledMembers.map((member) => {
                      const open = !!todayStats[member.id]?.open;
                      const clockIn = todayStats[member.id]?.clockIn;
                      const worked = todayStats[member.id]?.worked || 0;
                      return (
                        <tr key={member.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-[9px] bg-slate-100">{initials(member.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-slate-800 font-medium truncate">{member.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{member.title}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={open ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                              {open ? "Clocked In" : "Off"}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 hidden sm:table-cell text-slate-600">{open ? timeLabel(clockIn) : "—"}</td>
                          <td className="py-3 px-2 hidden sm:table-cell text-slate-600">{durationLabel(worked)}</td>
                          <td className="py-3 px-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === member.id}
                              onClick={() => handleToggle(member.id)}
                              className={open ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}
                            >
                              {open ? <LogOut className="h-3.5 w-3.5 mr-1.5" /> : <LogIn className="h-3.5 w-3.5 mr-1.5" />}
                              {open ? "Clock Out" : "Clock In"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {enrolledMembers.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No active members with attendance enabled.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}