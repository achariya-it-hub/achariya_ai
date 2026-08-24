"use client";

import { useEffect, useState } from "react";
import { useCRMStore } from "@/store/crm-store";
import { initials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Phone,
  Bot,
  Sliders,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  Zap,
} from "lucide-react";

interface WhatsappConfig {
  id: string;
  phoneNumberId?: string;
  groupId?: string;
  webhookToken?: string;
  defaultProjectId?: string;
  enabled: boolean;
}

interface WhatsappLog {
  id: string;
  senderPhone: string;
  senderName?: string;
  groupId?: string;
  rawMessage: string;
  parsedAction?: string;
  status: string;
  taskId?: string;
  userId?: string;
  createdAt: string;
}

export default function WhatsappIntegrationPage() {
  const members = useCRMStore((s) => s.members);
  const projects = useCRMStore((s) => s.projects);
  const tasks = useCRMStore((s) => s.tasks);
  const loadStore = useCRMStore((s) => s.load);

  const [config, setConfig] = useState<WhatsappConfig>({
    id: "default",
    groupId: "group-crm-main",
    webhookToken: "wh_token_achariya_crm",
    enabled: true,
  });

  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"simulator" | "config" | "directory" | "logs">("simulator");

  // Simulator state
  const [simSender, setSimSender] = useState(members[0]?.email || "");
  const [simMessage, setSimMessage] = useState("#task task-1 status: in_progress");
  const [simSending, setSimSending] = useState(false);
  const [simResponse, setSimResponse] = useState<any>(null);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : "https://your-domain.com/api/webhooks/whatsapp";

  const fetchConfigAndLogs = async () => {
    setLoading(true);
    try {
      const [cfgRes, logsRes] = await Promise.all([
        fetch("/api/whatsapp/config").then((r) => r.json()),
        fetch("/api/whatsapp/logs").then((r) => r.json()),
      ]);
      if (cfgRes && !cfgRes.error) setConfig(cfgRes);
      if (Array.isArray(logsRes)) setLogs(logsRes);
    } catch (err) {
      console.error("Error loading WhatsApp config/logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndLogs();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data && !data.error) {
        setConfig(data);
        alert("WhatsApp configuration saved successfully!");
      }
    } catch (err) {
      alert("Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSimulatedMessage = async (msgToUse?: string) => {
    const textToSubmit = msgToUse || simMessage;
    if (!textToSubmit.trim()) return;

    setSimSending(true);
    setSimResponse(null);

    const selectedMember = members.find((m) => m.email === simSender) || members[0];
    const payload = {
      from: selectedMember?.phone || "+919876543210",
      senderName: selectedMember?.name || "Team Member",
      message: textToSubmit,
      groupId: config.groupId || "group-crm-main",
    };

    try {
      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      setSimResponse(result);

      // Trigger store refresh so tasks and activity feed update live!
      await loadStore();
      // Refresh local logs list
      const logsRes = await fetch("/api/whatsapp/logs").then((r) => r.json());
      if (Array.isArray(logsRes)) setLogs(logsRes);
    } catch (err) {
      setSimResponse({ error: String(err) });
    } finally {
      setSimSending(false);
    }
  };

  // Quick preset templates for testing
  const sampleTask = tasks[0];
  const sampleTaskCode = sampleTask ? sampleTask.id : "task-1";

  const quickPresets = [
    { label: "Update Status to Done", text: `Task ${sampleTaskCode} status: done` },
    { label: "Update Status to In Progress", text: `Task ${sampleTaskCode} status: in_progress` },
    { label: "Assign Task to Member", text: `Assign ${sampleTaskCode} to ${members[0]?.name || "John"}` },
    { label: "Create New Task", text: `#newtask Fix navbar responsive alignment priority:high` },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <MessageSquare className="h-7 w-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">WhatsApp Group Task Bot</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                  <Sparkles className="h-3 w-3" /> Live Automation
                </span>
              </div>
              <p className="mt-1 text-sm text-emerald-100/80">
                Connect your WhatsApp Group to automatically assign, update status, and manage tasks for your team.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchConfigAndLogs}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Sync Logs
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "simulator"
                ? "bg-white text-emerald-950 shadow-md font-semibold"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Bot className="h-4 w-4" />
            Live Group Simulator
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "config"
                ? "bg-white text-emerald-950 shadow-md font-semibold"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Webhook & Credentials
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "directory"
                ? "bg-white text-emerald-950 shadow-md font-semibold"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Phone className="h-4 w-4" />
            Team Phone Mapping ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "logs"
                ? "bg-white text-emerald-950 shadow-md font-semibold"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" />
            Audit Logs ({logs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Simulator Box */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20">
                    WA
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">WhatsApp Group Chat Simulator</h2>
                    <p className="text-xs text-slate-500">
                      Simulate posting a message in group <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{config.groupId}</span>
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Sync Active
                </span>
              </div>

              {/* Sender Select */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Select Simulated Sender (Team Member)
                  </label>
                  <select
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.email}>
                        {m.name} ({m.phone || "No Phone Registered"}) - {m.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Quick Sample Commands
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {quickPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSimMessage(preset.text);
                          handleSendSimulatedMessage(preset.text);
                        }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        ⚡ {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input Box */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Group Message Text
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      placeholder="e.g. #task task-1 status: done assign: John"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleSendSimulatedMessage()}
                      disabled={simSending || !simMessage.trim()}
                      className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                      {simSending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Send Message
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Simulation Result Box */}
                {simResponse && (
                  <div className={`rounded-xl border p-4 transition-all ${
                    simResponse.success
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                      : "border-amber-200 bg-amber-50/50 text-amber-900"
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {simResponse.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <span>Result: {simResponse.actionTaken}</span>
                    </div>

                    <div className="mt-2 text-xs space-y-1 font-mono">
                      {simResponse.matchedUser && (
                        <p>👤 Sender Matched: <span className="font-semibold text-slate-800">{simResponse.matchedUser.name} ({simResponse.matchedUser.email})</span></p>
                      )}
                      {simResponse.taskId && (
                        <p>📌 Task ID Affected: <span className="font-semibold text-slate-800">{simResponse.taskId}</span></p>
                      )}
                      <p className="text-[11px] text-slate-500 pt-1">
                        ✨ Dashboard state updated live! Check the <span className="underline font-sans font-medium">Tasks</span> tab to see changes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Helper Rules & Syntax Guide */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-600" /> Command Syntax Guide
              </h3>
              
              <div className="space-y-3 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                  <p className="font-semibold text-slate-800">1. Update Task Status</p>
                  <p className="font-mono text-[11px] text-emerald-700">Task &lt;taskId&gt; status: done</p>
                  <p className="text-slate-500">Supports: <code className="text-slate-700">todo</code>, <code className="text-slate-700">in_progress</code>, <code className="text-slate-700">review</code>, <code className="text-slate-700">done</code></p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                  <p className="font-semibold text-slate-800">2. Reassign Task to Member</p>
                  <p className="font-mono text-[11px] text-emerald-700">Assign &lt;taskId&gt; to John</p>
                  <p className="text-slate-500">Matches team member by name, email, or registered phone.</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                  <p className="font-semibold text-slate-800">3. Create New Task</p>
                  <p className="font-mono text-[11px] text-emerald-700">#newtask &lt;title&gt; priority:high</p>
                  <p className="text-slate-500">Automatically creates task and logs activity feed.</p>
                </div>
              </div>
            </div>

            {/* Quick Status Stats */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Task Overview</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-xl font-bold text-slate-900">{tasks.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Total Tasks</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                  <p className="text-xl font-bold text-emerald-700">{tasks.filter((t) => t.status === "done").length}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURATION */}
      {activeTab === "config" && (
        <div className="max-w-3xl space-y-6">
          <form onSubmit={handleSaveConfig} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900">WhatsApp Webhook Settings</h2>

            {/* Webhook Endpoint Display */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Webhook Callback URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-700"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy URL"}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Paste this URL into your Meta WhatsApp Cloud API or WhatsApp Gateway Webhook dashboard.
              </p>
            </div>

            {/* Verification Token */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Webhook Verification Token (hub.verify_token)
              </label>
              <input
                type="text"
                value={config.webhookToken || ""}
                onChange={(e) => setConfig({ ...config, webhookToken: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Target Group ID */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Target WhatsApp Group ID
              </label>
              <input
                type="text"
                value={config.groupId || ""}
                onChange={(e) => setConfig({ ...config, groupId: e.target.value })}
                placeholder="e.g. group-crm-main"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Messages from this WhatsApp group will be parsed and executed.
              </p>
            </div>

            {/* Default Project */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Default Project for New WhatsApp Tasks
              </label>
              <select
                value={config.defaultProjectId || ""}
                onChange={(e) => setConfig({ ...config, defaultProjectId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Select Default Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Enabled Switch */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Enable WhatsApp Automation</p>
                <p className="text-xs text-slate-500">Master switch to turn WhatsApp message parsing on or off.</p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all"
              >
                {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save Configuration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TEAM PHONE DIRECTORY */}
      {activeTab === "directory" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Team Phone Mapping Directory</h2>
              <p className="text-xs text-slate-500">
                WhatsApp incoming messages match senders against registered team member phone numbers and names.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Role & Dept</th>
                  <th className="px-4 py-3">Assigned Tasks</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const memberTasksCount = tasks.filter((t) => t.assigneeId === m.id).length;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.avatar} />
                            <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                              {initials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900">{m.name}</p>
                            <p className="text-xs text-slate-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          {m.phone || "Not Set (+91...)"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">{m.title || m.department} ({m.role})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {memberTasksCount} tasks
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <UserCheck className="h-3.5 w-3.5" /> Matched
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Incoming Audit Logs</h2>
              <p className="text-xs text-slate-500">History of all incoming group messages and automated CRM actions.</p>
            </div>
            <button
              onClick={fetchConfigAndLogs}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No WhatsApp message logs recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">Use the Live Group Simulator tab to test incoming messages!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Sender</th>
                    <th className="px-4 py-3">Message Content</th>
                    <th className="px-4 py-3">Action Taken</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-sans font-medium text-slate-900">
                        {log.senderName || log.senderPhone}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-800" title={log.rawMessage}>
                        "{log.rawMessage}"
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          log.parsedAction === "TASK_CREATED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : log.parsedAction === "TASK_UPDATED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {log.parsedAction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
