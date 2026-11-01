"use client";

import { useState, useMemo, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCRMStore } from "@/store/crm-store";
import { useAuth } from "@/components/providers/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon-3d";
import { SocialPost, SocialPlatform, SocialPostStatus } from "@/types";
import {
  downloadSocialMediaCSVTemplate,
  parseSocialMediaCSV,
  exportSocialMediaPostsToCSV,
  ParsedSocialRow,
} from "@/lib/csv-social";
import { downloadICSFile } from "@/lib/calendar-export";
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Hash,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  FileText,
  Archive,
  Globe,
  Video,
  Radio,
  FileSpreadsheet,
  Download,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Edit,
  ExternalLink,
  Layers,
  Sparkles,
  List,
  CalendarDays,
  Send,
  AlertTriangle,
  Building2,
  BellRing,
  Bell,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  formatDistanceToNow,
} from "date-fns";
import { toast } from "sonner";
import { playReminderSound, playSuccessSound } from "@/components/calendar/calendar-reminder-notifier";

const DEFAULT_COMPANIES = [
  "Digiventures",
  "RBIQ",
  "Hope Cafe",
  "Hope Life Kombucha",
  "All Brands",
  "Le Colonial Suites",
  "Le Pondicherry Cheese",
  "Q-School",
  "Shambhala",
  "Bushido",
  "Heguru",
  "WOW",
];

const companyColors: Record<string, { bg: string; text: string; border: string }> = {
  Digiventures: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  RBIQ: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  Shambhala: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  Qschool: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  "Q-School": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  Bushido: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  Heguru: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  WOW: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  "Hope Cafe": { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30" },
  "Hope Life Kombucha": { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30" },
  "All brands": { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  "All Brands": { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  "Le Colonial Suites": { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30" },
  "Le Pondicherry Cheese": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
};

const platformConfig: Record<SocialPlatform, { label: string; color: string; bgSoft: string; icon: any }> = {
  instagram: {
    label: "Instagram",
    color: "bg-gradient-to-r from-pink-500 to-orange-500 text-white",
    bgSoft: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    icon: Globe,
  },
  facebook: {
    label: "Facebook",
    color: "bg-blue-600 text-white",
    bgSoft: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Globe,
  },
  linkedin: {
    label: "LinkedIn",
    color: "bg-blue-700 text-white",
    bgSoft: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
    icon: Globe,
  },
  twitter: {
    label: "X (Twitter)",
    color: "bg-black text-white",
    bgSoft: "bg-slate-800/10 text-slate-800 dark:text-slate-200 border-slate-700/20",
    icon: Globe,
  },
  youtube: {
    label: "YouTube",
    color: "bg-red-600 text-white",
    bgSoft: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: Video,
  },
  tiktok: {
    label: "TikTok",
    color: "bg-black text-white",
    bgSoft: "bg-slate-900/10 text-slate-900 dark:text-white border-slate-900/20",
    icon: Radio,
  },
  pinterest: {
    label: "Pinterest",
    color: "bg-red-500 text-white",
    bgSoft: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: ImageIcon,
  },
  other: {
    label: "Other",
    color: "bg-slate-600 text-white",
    bgSoft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    icon: Hash,
  },
};

const statusConfig: Record<SocialPostStatus, { label: string; color: string; icon: any }> = {
  idea: { label: "Idea", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300", icon: FileText },
  draft: { label: "Draft", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300", icon: FileText },
  scheduled: { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300", icon: Clock },
  published: { label: "Published", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300", icon: CheckCircle2 },
  archived: { label: "Archived", color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400", icon: Archive },
};

function SocialMediaCalendarInner() {
  const {
    socialPosts = [],
    addSocialPost,
    bulkImportSocialPosts,
    updateSocialPost,
    deleteSocialPost,
    snoozeSocialPostReminder,
    toggleSocialPostProcessed,
  } = useCRMStore();
  const { user } = useAuth();

  // Navigation & View state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<"calendar" | "list" | "reminders">("calendar");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<SocialPost | null>(null);

  // CSV Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSocialRow[]>([]);
  const [importTargetCompany, setImportTargetCompany] = useState<string>("auto");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available Companies
  const availableCompanies = useMemo(() => {
    const list = [...DEFAULT_COMPANIES];
    (socialPosts || []).forEach((p) => {
      if (p.company && p.company.trim() && !list.includes(p.company.trim())) {
        list.push(p.company.trim());
      }
    });
    return list;
  }, [socialPosts]);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    company: "Digiventures",
    platform: "instagram" as SocialPlatform,
    status: "scheduled" as SocialPostStatus,
    scheduledDate: format(new Date(), "yyyy-MM-dd"),
    scheduledTime: "12:00",
    content: "",
    mediaUrl: "",
    hashtags: "",
    reminderInterval: 30,
  });

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return (socialPosts || [])
      .filter((post) => {
        if (selectedCompany === "all") return true;
        const postCompany = post.company?.trim() || "Digiventures";
        return postCompany.toLowerCase() === selectedCompany.toLowerCase();
      })
      .filter((post) => filterPlatform === "all" || post.platform === filterPlatform)
      .filter((post) => filterStatus === "all" || post.status === filterStatus)
      .filter((post) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          post.title?.toLowerCase().includes(q) ||
          post.company?.toLowerCase().includes(q) ||
          post.content?.toLowerCase().includes(q) ||
          post.hashtags?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [socialPosts, selectedCompany, filterPlatform, filterStatus, searchQuery]);

  // Calendar Month Grid computations
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Group posts by day key (YYYY-MM-DD)
  const postsByDay = useMemo(() => {
    const groups: Record<string, SocialPost[]> = {};
    filteredPosts.forEach((post) => {
      if (post.scheduledAt) {
        try {
          const key = format(new Date(post.scheduledAt), "yyyy-MM-dd");
          if (!groups[key]) groups[key] = [];
          groups[key].push(post);
        } catch (e) {
          // ignore invalid date
        }
      }
    });
    return groups;
  }, [filteredPosts]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredPosts.length;
    const scheduled = filteredPosts.filter((p) => p.status === "scheduled").length;
    const published = filteredPosts.filter((p) => p.status === "published").length;
    const drafts = filteredPosts.filter((p) => p.status === "draft" || p.status === "idea").length;
    return { total, scheduled, published, drafts };
  }, [filteredPosts]);

  // Incomplete / Pending Calendar Works
  const incompleteWorks = useMemo(() => {
    const now = Date.now();
    return filteredPosts
      .filter((p) => !p.isProcessed && p.status !== "published" && p.status !== "archived")
      .map((p) => {
        const timeMs = p.scheduledAt ? new Date(p.scheduledAt).getTime() : new Date(p.createdAt).getTime();
        return {
          ...p,
          isOverdue: !isNaN(timeMs) && timeMs < now,
        };
      })
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return timeA - timeB;
      });
  }, [filteredPosts]);

  const overdueWorks = useMemo(() => incompleteWorks.filter((w) => w.isOverdue), [incompleteWorks]);
  const upcomingIncompleteWorks = useMemo(() => incompleteWorks.filter((w) => !w.isOverdue), [incompleteWorks]);

  const handleMarkWorkComplete = async (postId: string, title?: string) => {
    playSuccessSound();
    await toggleSocialPostProcessed(postId, true);
    toast.success(`"${title || "Calendar work"}" marked as completed!`);
  };

  const handleSnoozeWork = async (postId: string, minutes: number) => {
    await snoozeSocialPostReminder(postId, minutes);
    toast.info(`Reminder snoozed for ${minutes} minutes`);
  };

  // Handlers for Add/Edit Modal
  const openNewPostModal = (initialDate?: Date) => {
    const targetDate = initialDate || new Date();
    setEditingPostId(null);
    setForm({
      title: "",
      description: "",
      company: selectedCompany !== "all" ? selectedCompany : "Digiventures",
      platform: "instagram",
      status: "scheduled",
      scheduledDate: format(targetDate, "yyyy-MM-dd"),
      scheduledTime: "12:00",
      content: "",
      mediaUrl: "",
      hashtags: "",
      reminderInterval: 30,
    });
    setPostModalOpen(true);
  };

  const openEditPostModal = (post: SocialPost) => {
    setEditingPostId(post.id);
    const sDate = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
    setForm({
      title: post.title,
      description: post.description || "",
      company: post.company || "Digiventures",
      platform: post.platform,
      status: post.status,
      scheduledDate: format(sDate, "yyyy-MM-dd"),
      scheduledTime: format(sDate, "HH:mm"),
      content: post.content || "",
      mediaUrl: post.mediaUrl || "",
      hashtags: post.hashtags || "",
      reminderInterval: post.reminderInterval || 30,
    });
    setPostModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a post title");
      return;
    }

    try {
      const scheduledDateTime = new Date(`${form.scheduledDate}T${form.scheduledTime}:00`);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || form.content.trim() || null,
        company: form.company.trim() || "Digiventures",
        platform: form.platform,
        status: form.status,
        scheduledAt: scheduledDateTime.toISOString(),
        publishedAt: form.status === "published" ? new Date().toISOString() : null,
        content: form.content.trim() || null,
        mediaUrl: form.mediaUrl.trim() || null,
        hashtags: form.hashtags.trim() || null,
        isProcessed: form.status === "published",
        reminderInterval: Number(form.reminderInterval) || 30,
      };

      if (editingPostId) {
        await updateSocialPost(editingPostId, payload);
        toast.success("Calendar post updated!");
      } else {
        await addSocialPost(payload);
        toast.success("Post added to calendar!");
      }

      setPostModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save post");
    }
  };

  // CSV File Handler
  const handleCSVSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setImportFile(file);
    setIsParsing(true);

    try {
      const rows = await parseSocialMediaCSV(file);
      setParsedRows(rows);
      toast.success(`Parsed ${rows.length} rows from ${file.name}`);
    } catch (err: any) {
      toast.error("Failed to parse CSV file: " + err.message);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Execute Bulk CSV Import
  const handleExecuteCSVImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsImporting(true);
    try {
      const postsToCreate = validRows.map((r) => ({
        title: r.title,
        description: r.description || null,
        company: importTargetCompany !== "auto" ? importTargetCompany : (r.company || (selectedCompany !== "all" ? selectedCompany : "Digiventures")),
        platform: r.platform,
        status: r.status,
        scheduledAt: r.scheduledAt,
        publishedAt: r.status === "published" ? new Date().toISOString() : null,
        content: r.content || null,
        mediaUrl: r.mediaUrl || null,
        hashtags: r.hashtags || null,
        isProcessed: r.isProcessed,
        reminderInterval: r.reminderInterval || 30,
      }));

      const count = await bulkImportSocialPosts(postsToCreate);
      toast.success(`Successfully imported ${count} posts into the calendar!`);
      setImportModalOpen(false);
      setImportFile(null);
      setParsedRows([]);
      setView("calendar");
    } catch (err: any) {
      toast.error("CSV Import failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Quick mark post as published
  const handleTogglePublish = async (post: SocialPost) => {
    const isNowPublished = post.status !== "published";
    await updateSocialPost(post.id, {
      status: isNowPublished ? "published" : "scheduled",
      isProcessed: isNowPublished,
      publishedAt: isNowPublished ? new Date().toISOString() : null,
    });
    toast.success(isNowPublished ? `"${post.title}" marked as Published!` : "Post reverted to scheduled");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center gap-4">
          <Icon3D gradient="pink">
            <CalendarIcon className="h-6 w-6 text-white" />
          </Icon3D>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Calendar
              </h1>
              {selectedCompany !== "all" && (
                <Badge className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 text-xs font-semibold px-2.5 py-0.5">
                  {selectedCompany}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Plan, schedule, and switch calendars across Digiventures companies, clients, and sister brands
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Company Switcher Dropdown in Header */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-xs">
            <Building2 className="h-4 w-4 text-pink-500 shrink-0" />
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Company:</span>
            <Select value={selectedCompany} onValueChange={(v) => setSelectedCompany(v || "all")}>
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-bold text-slate-900 dark:text-white px-1 shadow-none focus:ring-0 w-[140px]">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-semibold">All Companies</span>
                </SelectItem>
                {availableCompanies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={downloadSocialMediaCSVTemplate}
            className="gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Download</span> CSV Template
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              const icsEvents = filteredPosts
                .filter((p) => p.scheduledAt)
                .map((p) => ({
                  title: `[${p.platform.toUpperCase()}] ${p.title}`,
                  description: `${p.content || p.description || ""}\nCompany: ${p.company || "Digiventures"}\nHashtags: ${p.hashtags || ""}`,
                  startTime: p.scheduledAt!,
                  location: p.platform,
                  url: p.postUrl || undefined,
                }));
              downloadICSFile("Social_Calendar_Schedule.ics", icsEvents);
            }}
            className="gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Export scheduled social media posts to iCal / Google Calendar"
          >
            <CalendarIcon className="h-4 w-4 text-indigo-500" />
            <span className="hidden sm:inline">Export</span> iCal (.ics)
          </Button>

          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="gap-2 border-pink-300 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100"
          >
            <FileSpreadsheet className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            Upload CSV / Excel
          </Button>

          <Button
            variant="outline"
            onClick={() => exportSocialMediaPostsToCSV(filteredPosts, selectedCompany === "all" ? "Calendar_All_Companies.csv" : `Calendar_${selectedCompany}.csv`)}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button
            onClick={() => openNewPostModal()}
            className="gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg shadow-pink-500/25"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>
      </motion.div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Content</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-pink-500/10 text-pink-600 rounded-xl">
              <CalendarDays className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Scheduled</p>
                {stats.scheduled > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.scheduled}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.published}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setView("reminders")}
          className={`border shadow-sm cursor-pointer transition-all hover:scale-[1.01] ${
            overdueWorks.length > 0
              ? "border-rose-300 dark:border-rose-800/80 bg-gradient-to-br from-rose-500/10 via-white to-rose-500/5 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900"
              : "border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Pending Works
                </p>
                {overdueWorks.length > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {incompleteWorks.length}
                </h3>
                {overdueWorks.length > 0 ? (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full">
                    {overdueWorks.length} overdue
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    all on track
                  </span>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${overdueWorks.length > 0 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
              <BellRing className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Bar */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setView("calendar")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === "calendar"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              Month Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === "list"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <List className="h-4 w-4" />
              Feed / List View
            </button>
            <button
              onClick={() => setView("reminders")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === "reminders"
                  ? "bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <BellRing className="h-4 w-4 text-pink-500" />
              Reminders & Works
              {incompleteWorks.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    overdueWorks.length > 0
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  }`}
                >
                  {incompleteWorks.length}
                </span>
              )}
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <div className="relative min-w-[180px] flex-1 md:flex-none">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search company, title, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Company Dropdown Filter */}
            <Select value={selectedCompany} onValueChange={(v) => setSelectedCompany(v || "all")}>
              <SelectTrigger className="w-[155px] h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-pink-200 dark:border-pink-900/50">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                  <span className="truncate">
                    {selectedCompany === "all" ? "All Companies" : selectedCompany}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2 font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    All Companies
                  </div>
                </SelectItem>
                {availableCompanies.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0" />
                      <span>{comp}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v || "all")}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {Object.entries(platformConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="h-3.5 w-3.5" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "all")}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ================= VIEW: INTERACTIVE MONTH CALENDAR ================= */}
      {view === "calendar" && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Calendar Top Navigation Bar */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="text-xs text-pink-600 dark:text-pink-400 font-semibold hover:bg-pink-50 dark:hover:bg-pink-950/50"
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-center text-xs font-bold text-slate-500 py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-800 gap-[1px]">
            {monthDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDay[dayKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => openNewPostModal(day)}
                  className={`min-h-[120px] p-2 bg-white dark:bg-slate-900 transition-colors flex flex-col justify-between cursor-pointer group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                    !isCurrentMonth ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full ${
                        isCurrentToday
                          ? "bg-pink-600 text-white shadow-sm"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {dayPosts.length > 0 && (
                      <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>

                  {/* Post Badges on Calendar Day */}
                  <div className="space-y-1.5 mt-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayPosts.slice(0, 3).map((post) => {
                      const platform = platformConfig[post.platform] || platformConfig.other;
                      const PlatformIcon = platform.icon;
                      const postCompany = post.company || "Digiventures";
                      const compStyle = companyColors[postCompany] || {
                        bg: "bg-slate-500/10",
                        text: "text-slate-600 dark:text-slate-400",
                        border: "border-slate-500/20",
                      };
                      return (
                        <div
                          key={post.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPost(post);
                            setDetailModalOpen(true);
                          }}
                          className={`px-1.5 py-1 rounded-lg text-[11px] truncate flex items-center gap-1.5 border shadow-2xs hover:scale-[1.02] transition-transform ${platform.bgSoft}`}
                        >
                          <PlatformIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate font-medium flex-1">{post.title}</span>
                          {selectedCompany === "all" && (
                            <span className={`text-[9px] px-1 py-0.2 rounded font-semibold shrink-0 ${compStyle.bg} ${compStyle.text}`}>
                              {postCompany}
                            </span>
                          )}
                          {post.status === "published" && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 ml-auto" />
                          )}
                        </div>
                      );
                    })}

                    {dayPosts.length > 3 && (
                      <p className="text-[10px] text-slate-400 font-medium pl-1">
                        +{dayPosts.length - 3} more posts
                      </p>
                    )}
                  </div>

                  <div className="text-[10px] text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity text-right font-medium">
                    + Schedule
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ================= VIEW: FEED / LIST VIEW ================= */}
      {view === "list" && (
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card className="border-0 shadow-sm p-12 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No posts found</h3>
              <p className="text-slate-500 mb-4">Start planning your calendar content or upload a CSV file</p>
              <Button onClick={() => openNewPostModal()} className="gap-2 bg-gradient-to-r from-pink-500 to-pink-600">
                <Plus className="h-4 w-4" />
                Create Post
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post) => {
                const platform = platformConfig[post.platform] || platformConfig.other;
                const status = statusConfig[post.status] || statusConfig.scheduled;
                const PlatformIcon = platform.icon;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl ${platform.color} shadow-xs`}>
                              <PlatformIcon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {platform.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {post.company && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold border ${
                                  companyColors[post.company]?.bg || "bg-slate-100 dark:bg-slate-800"
                                } ${companyColors[post.company]?.text || "text-slate-700 dark:text-slate-300"} ${
                                  companyColors[post.company]?.border || "border-slate-300 dark:border-slate-700"
                                }`}
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                {post.company}
                              </Badge>
                            )}
                            <Badge className={`${status.color} border gap-1 text-[10px]`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1">
                            {post.title}
                          </h4>
                          {post.scheduledAt && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="h-3.5 w-3.5 text-pink-500" />
                              {format(new Date(post.scheduledAt), "EEEE, MMM d • h:mm a")}
                            </p>
                          )}
                        </div>

                        {post.content && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {post.content}
                          </p>
                        )}

                        {post.hashtags && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium line-clamp-1">
                            {post.hashtags}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant={post.status === "published" ? "outline" : "default"}
                            onClick={() => handleTogglePublish(post)}
                            className={`flex-1 text-xs h-8 gap-1.5 ${
                              post.status === "published"
                                ? "text-slate-500"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {post.status === "published" ? "Published" : "Mark Published"}
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditPostModal(post)}
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Delete this social post?")) {
                                deleteSocialPost(post.id);
                                toast.success("Post deleted");
                              }
                            }}
                            className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW: REMINDERS & PENDING WORKS ================= */}
      {view === "reminders" && (
        <div className="space-y-6">
          {/* Reminders Dashboard Banner */}
          <Card className="border border-pink-200/60 dark:border-pink-900/40 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-amber-500/10 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-xl">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Reminders & Incomplete Calendar Works
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                    Track calendar events and social posts that are not yet completed. The system automatically rings audio alerts and displays desktop notifications for overdue and upcoming works.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      playReminderSound();
                      toast.info("Chime alert sound tested successfully!");
                    }}
                    className="text-xs font-semibold gap-1.5 bg-white/80 dark:bg-slate-900/80"
                  >
                    <Bell className="h-3.5 w-3.5 text-pink-500" />
                    Test Alert Chime
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if ("Notification" in window) {
                        const perm = await Notification.requestPermission();
                        if (perm === "granted") {
                          toast.success("Desktop notifications enabled!");
                        } else {
                          toast.info(`Notification permission: ${perm}`);
                        }
                      } else {
                        toast.error("Browser does not support desktop notifications");
                      }
                    }}
                    className="text-xs font-semibold gap-1.5 bg-white/80 dark:bg-slate-900/80"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Enable Desktop Alerts
                  </Button>
                </div>
              </div>

              {selectedCompany !== "all" && (
                <div className="mt-4 pt-3 border-t border-pink-200/40 dark:border-pink-900/30 flex items-center gap-2 text-xs text-pink-900 dark:text-pink-200">
                  <Building2 className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                  <span>
                    Currently filtering reminders for <strong>{selectedCompany}</strong>. Switch to <em>All Companies</em> to see works across every organization.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 1: Overdue Works (Urgent) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Overdue Works
                </h3>
                <Badge className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5">
                  {overdueWorks.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Works past their scheduled time requiring completion or rescheduling
              </p>
            </div>

            {overdueWorks.length === 0 ? (
              <Card className="border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-6 text-center rounded-2xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  No overdue works!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  All scheduled tasks and posts up to now have been completed or are on track.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overdueWorks.map((work) => {
                  const platform = platformConfig[work.platform] || platformConfig.other;
                  const PlatformIcon = platform.icon;
                  const companyName = work.company || "Digiventures";
                  const compColor = companyColors[companyName] || companyColors.Digiventures;
                  const scheduledDate = work.scheduledAt ? new Date(work.scheduledAt) : null;

                  return (
                    <motion.div
                      key={work.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card className="border-2 border-rose-300 dark:border-rose-900/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 flex flex-col justify-between h-full">
                        <CardContent className="p-4 space-y-3">
                          {/* Card Top: Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold border ${compColor.bg} ${compColor.text} ${compColor.border}`}
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              {companyName}
                            </Badge>

                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                                Overdue {scheduledDate ? formatDistanceToNow(scheduledDate, { addSuffix: true }) : ""}
                              </span>
                            </div>
                          </div>

                          {/* Work Title & Platform */}
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              <PlatformIcon className="h-3.5 w-3.5 text-pink-500" />
                              <span>{platform.label}</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-2">
                              {work.title}
                            </h4>
                            {scheduledDate && (
                              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-1">
                                <Clock className="h-3.5 w-3.5" />
                                Was due: {format(scheduledDate, "EEEE, MMM d • h:mm a")}
                              </p>
                            )}
                          </div>

                          {/* Content Preview */}
                          {work.content && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              {work.content}
                            </p>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleMarkWorkComplete(work.id, work.title)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                            >
                              <Check className="h-4 w-4" />
                              Mark as Completed
                            </Button>

                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSnoozeWork(work.id, 15)}
                                className="flex-1 text-[11px] h-7 px-2 font-medium text-slate-600 dark:text-slate-300"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Snooze 15m
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSnoozeWork(work.id, 60)}
                                className="flex-1 text-[11px] h-7 px-2 font-medium text-slate-600 dark:text-slate-300"
                              >
                                Snooze 1h
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditPostModal(work)}
                                className="h-7 px-2 text-[11px] text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Upcoming Incomplete Works */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Incomplete Works
                </h3>
                <Badge className="bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5">
                  {upcomingIncompleteWorks.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Scheduled works queued for future publication or review
              </p>
            </div>

            {upcomingIncompleteWorks.length === 0 ? (
              <Card className="border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center rounded-2xl">
                <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No upcoming pending works
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a new calendar post or upload a CSV schedule to get started.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingIncompleteWorks.map((work) => {
                  const platform = platformConfig[work.platform] || platformConfig.other;
                  const PlatformIcon = platform.icon;
                  const companyName = work.company || "Digiventures";
                  const compColor = companyColors[companyName] || companyColors.Digiventures;
                  const scheduledDate = work.scheduledAt ? new Date(work.scheduledAt) : null;

                  return (
                    <motion.div
                      key={work.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                        <CardContent className="p-4 space-y-3">
                          {/* Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold border ${compColor.bg} ${compColor.text} ${compColor.border}`}
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              {companyName}
                            </Badge>

                            {scheduledDate && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                                Due {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                              </span>
                            )}
                          </div>

                          {/* Title & Platform */}
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              <PlatformIcon className="h-3.5 w-3.5 text-pink-500" />
                              <span>{platform.label}</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-2">
                              {work.title}
                            </h4>
                            {scheduledDate && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <Clock className="h-3.5 w-3.5 text-blue-500" />
                                {format(scheduledDate, "EEEE, MMM d • h:mm a")}
                              </p>
                            )}
                          </div>

                          {/* Content Preview */}
                          {work.content && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              {work.content}
                            </p>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleMarkWorkComplete(work.id, work.title)}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-semibold text-xs gap-1.5 h-8"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                              Mark Done
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditPostModal(work)}
                              className="h-8 px-2.5 text-xs"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CSV BULK IMPORT ================= */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileSpreadsheet className="h-5 w-5 text-pink-600" />
              Upload CSV / Excel to Calendar
            </DialogTitle>
            <DialogDescription>
              Upload a .csv or .xlsx spreadsheet with your planned posts and events. Posts will be mapped to each company&apos;s calendar schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Company Setting & Template Download Prompt */}
            <div className="p-3.5 bg-pink-50/60 dark:bg-pink-950/30 border border-pink-200/60 dark:border-pink-900/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-pink-950 dark:text-pink-200">
                  Target Company Calendar
                </p>
                <p className="text-[11px] text-pink-700 dark:text-pink-300">
                  Choose default company or let the spreadsheet &quot;Company&quot; column assign automatically.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={importTargetCompany} onValueChange={(v) => setImportTargetCompany(v || "auto")}>
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-white dark:bg-slate-900 border-pink-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Use CSV &quot;Company&quot; column</SelectItem>
                    {availableCompanies.map((c) => (
                      <SelectItem key={c} value={c}>
                        Assign all to {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadSocialMediaCSVTemplate}
                  className="gap-1.5 shrink-0 text-xs border-pink-300 dark:border-pink-700 text-pink-800 dark:text-pink-200 bg-white dark:bg-slate-900 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Template .csv
                </Button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-pink-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleCSVSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-pink-500/10 text-pink-600 rounded-full">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {importFile ? importFile.name : "Click to select or drag & drop a CSV file"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports .csv, .xlsx, and .xls files
                  </p>
                </div>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {isParsing && (
              <div className="p-6 text-center text-sm text-slate-500">
                Parsing CSV rows and validating platforms...
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Found {parsedRows.length} rows ({parsedRows.filter((r) => r.isValid).length} ready to import)
                  </span>
                  {parsedRows.some((r) => !r.isValid) && (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {parsedRows.filter((r) => !r.isValid).length} rows have missing title or date
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-2.5">Title</th>
                        <th className="p-2.5">Company</th>
                        <th className="p-2.5">Platform</th>
                        <th className="p-2.5">Scheduled Date</th>
                        <th className="p-2.5">Caption Preview</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.map((row, idx) => {
                        const targetComp = importTargetCompany !== "auto" ? importTargetCompany : (row.company || "Digiventures");
                        return (
                          <tr
                            key={idx}
                            className={row.isValid ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" : "bg-red-50/50 dark:bg-red-950/20"}
                          >
                            <td className="p-2.5 font-medium max-w-[140px] truncate">{row.title}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-600">
                                {targetComp}
                              </span>
                            </td>
                            <td className="p-2.5 capitalize">{row.platform}</td>
                            <td className="p-2.5 text-slate-500">
                              {format(new Date(row.scheduledAt), "MMM d, h:mm a")}
                            </td>
                            <td className="p-2.5 max-w-[160px] truncate">{row.content || "-"}</td>
                            <td className="p-2.5">
                              {row.isValid ? (
                                <span className="text-emerald-600 font-semibold">Valid</span>
                              ) : (
                                <span className="text-red-600 font-semibold">{row.validationError}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setParsedRows([]);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteCSVImport}
              disabled={isImporting || parsedRows.filter((r) => r.isValid).length === 0}
              className="gap-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isImporting
                ? "Importing..."
                : `Import ${parsedRows.filter((r) => r.isValid).length} Posts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: CREATE / EDIT SOCIAL POST ================= */}
      <Dialog open={postModalOpen} onOpenChange={setPostModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-pink-500" />
              {editingPostId ? "Edit Calendar Post" : "Create Calendar Post"}
            </DialogTitle>
            <DialogDescription>
              Schedule events, campaigns, and content for your chosen company or client.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePost} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Post Title *</Label>
              <Input
                placeholder="e.g. AI Workflow Announcement Reel"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Company / Brand Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-pink-500" />
                Company / Brand *
              </Label>
              <Select
                value={form.company}
                onValueChange={(val) => setForm({ ...form, company: val || "Digiventures" })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanies.map((comp) => (
                    <SelectItem key={comp} value={comp}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pink-500" />
                        <span>{comp}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Platform</Label>
                <Select
                  value={form.platform}
                  onValueChange={(val) => setForm({ ...form, platform: (val as SocialPlatform) || "instagram" })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(platformConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-3.5 w-3.5" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm({ ...form, status: (val as SocialPostStatus) || "scheduled" })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scheduled Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Scheduled Date *</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Scheduled Time</Label>
                <Input
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            {/* Content / Caption */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Caption / Post Copy</Label>
              <Textarea
                placeholder="Write the full post caption or draft text here..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-blue-500" />
                Hashtags
              </Label>
              <Input
                placeholder="#AI #TechTrends #Productivity #CRM"
                value={form.hashtags}
                onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              />
            </div>

            {/* Media URL */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-pink-500" />
                Media / Image URL (Optional)
              </Label>
              <Input
                placeholder="https://images.unsplash.com/... or Google Drive link"
                value={form.mediaUrl}
                onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPostModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">
                {editingPostId ? "Save Changes" : "Schedule Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: POST DETAILS ================= */}
      {viewingPost && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                {viewingPost.company && (
                  <Badge
                    variant="outline"
                    className={`border text-xs font-bold ${
                      companyColors[viewingPost.company]?.bg || "bg-slate-100 dark:bg-slate-800"
                    } ${companyColors[viewingPost.company]?.text || "text-slate-800 dark:text-slate-200"} ${
                      companyColors[viewingPost.company]?.border || "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 mr-1" />
                    {viewingPost.company}
                  </Badge>
                )}
                <Badge className={platformConfig[viewingPost.platform]?.color || "bg-slate-700 text-white"}>
                  {platformConfig[viewingPost.platform]?.label || viewingPost.platform}
                </Badge>
                <Badge className={statusConfig[viewingPost.status]?.color || "bg-slate-100"}>
                  {statusConfig[viewingPost.status]?.label || viewingPost.status}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold mt-2">{viewingPost.title}</DialogTitle>
              {viewingPost.scheduledAt && (
                <DialogDescription className="text-xs">
                  Scheduled for: {format(new Date(viewingPost.scheduledAt), "EEEE, MMMM d, yyyy • h:mm a")}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {viewingPost.content && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Caption</p>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{viewingPost.content}</p>
                </div>
              )}

              {viewingPost.hashtags && (
                <p className="text-blue-600 dark:text-blue-400 font-medium">{viewingPost.hashtags}</p>
              )}

              {viewingPost.mediaUrl && (
                <div className="rounded-xl overflow-hidden border max-h-48">
                  <img src={viewingPost.mediaUrl} alt={viewingPost.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  openEditPostModal(viewingPost);
                }}
              >
                Edit Post
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleTogglePublish(viewingPost);
                  setDetailModalOpen(false);
                }}
                className={
                  viewingPost.status === "published"
                    ? "bg-slate-600 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }
              >
                {viewingPost.status === "published" ? "Revert to Scheduled" : "Publish Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function SocialMediaCalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Calendar...</div>}>
      <SocialMediaCalendarInner />
    </Suspense>
  );
}
