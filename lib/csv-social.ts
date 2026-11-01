import * as XLSX from "xlsx";
import { SocialPost, SocialPlatform, SocialPostStatus } from "@/types";

export interface ParsedSocialRow {
  title: string;
  description?: string;
  company?: string;
  platform: SocialPlatform;
  status: SocialPostStatus;
  scheduledAt: string; // ISO string
  content?: string;
  hashtags?: string;
  mediaUrl?: string;
  reminderInterval: number; // in minutes
  isProcessed: boolean;
  isValid: boolean;
  validationError?: string;
}

export function downloadSocialMediaCSVTemplate() {
  const sampleRows = [
    {
      "Title *": "Product Feature Spotlight - AI Automation",
      "Company": "Digiventures",
      "Platform *": "instagram", // instagram, facebook, linkedin, twitter, youtube, tiktok, pinterest, other
      "Scheduled Date (YYYY-MM-DD) *": new Date(Date.now() + 86400000).toISOString().split("T")[0],
      "Scheduled Time (HH:mm)": "14:00",
      "Status": "scheduled", // idea, draft, scheduled, published
      "Content / Caption": "Supercharge your business productivity with Digiventures Workspace! Watch how automated workflow transforms CRM tasks.",
      "Hashtags": "#AI #Productivity #CRM #Automation #TechTrends",
      "Media URL": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
      "Reminder Interval (Minutes)": 30,
    },
    {
      "Title *": "Weekly Thought Leadership Insight",
      "Company": "RBIQ",
      "Platform *": "linkedin",
      "Scheduled Date (YYYY-MM-DD) *": new Date(Date.now() + 172800000).toISOString().split("T")[0],
      "Scheduled Time (HH:mm)": "09:30",
      "Status": "draft",
      "Content / Caption": "Key takeaways from our quarterly AI adoption benchmarks across modern enterprises.",
      "Hashtags": "#Leadership #EnterpriseAI #Innovation #B2B",
      "Media URL": "",
      "Reminder Interval (Minutes)": 45,
    },
    {
      "Title *": "Behind The Scenes Quick Reel",
      "Company": "Shambhala",
      "Platform *": "tiktok",
      "Scheduled Date (YYYY-MM-DD) *": new Date(Date.now() + 259200000).toISOString().split("T")[0],
      "Scheduled Time (HH:mm)": "18:00",
      "Status": "idea",
      "Content / Caption": "A day in the life of our development team building next gen solutions 🚀",
      "Hashtags": "#DevLife #Coding #TechTok #StartupLife",
      "Media URL": "",
      "Reminder Interval (Minutes)": 60,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "Calendar_Template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function parseDateCell(rawDate: any, rawTime?: any): Date | null {
  if (!rawDate) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  if (typeof rawDate === "number") {
    const parsed = XLSX.SSF.parse_date_code(rawDate);
    if (parsed) {
      year = parsed.y;
      month = parsed.m - 1;
      day = parsed.d;
    }
  } else if (typeof rawDate === "string") {
    const cleanStr = rawDate.trim();
    if (cleanStr.includes("-")) {
      const parts = cleanStr.split("-").map(Number);
      if (parts.length === 3) {
        if (parts[0] > 1000) {
          year = parts[0];
          month = parts[1] - 1;
          day = parts[2];
        } else {
          day = parts[0];
          month = parts[1] - 1;
          year = parts[2];
        }
      }
    } else if (cleanStr.includes("/")) {
      const parts = cleanStr.split("/").map(Number);
      if (parts.length === 3) {
        if (parts[2] > 1000) {
          month = parts[0] - 1;
          day = parts[1];
          year = parts[2];
        } else {
          day = parts[0];
          month = parts[1] - 1;
          year = parts[2] + 2000;
        }
      }
    } else {
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) return d;
    }
  } else if (rawDate instanceof Date) {
    return rawDate;
  }

  if (year === 0 || isNaN(year)) {
    const fallback = new Date(rawDate);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  let hours = 10;
  let minutes = 0;

  if (rawTime) {
    if (typeof rawTime === "string") {
      const timeParts = rawTime.trim().split(":");
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    } else if (typeof rawTime === "number") {
      const totalSeconds = Math.round(rawTime * 86400);
      hours = Math.floor(totalSeconds / 3600);
      minutes = Math.floor((totalSeconds % 3600) / 60);
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

export async function parseSocialMediaCSV(file: File): Promise<ParsedSocialRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const validPlatforms: SocialPlatform[] = [
    "instagram",
    "facebook",
    "linkedin",
    "twitter",
    "youtube",
    "tiktok",
    "pinterest",
    "other",
  ];

  const validStatuses: SocialPostStatus[] = ["idea", "draft", "scheduled", "published", "archived"];

  return rawRows.map((row) => {
    const title =
      row["Title *"] ||
      row["Title"] ||
      row["title"] ||
      row["Post Title"] ||
      row["Topic"] ||
      "";

    const company = (
      row["Company"] ||
      row["company"] ||
      row["Client"] ||
      row["client"] ||
      row["Organization"] ||
      "Digiventures"
    ).toString().trim();

    let platformRaw = (row["Platform *"] || row["Platform"] || row["platform"] || "instagram")
      .toString()
      .toLowerCase()
      .trim();

    if (platformRaw === "x" || platformRaw === "tweet") platformRaw = "twitter";
    if (platformRaw === "fb") platformRaw = "facebook";
    if (platformRaw === "insta" || platformRaw === "ig") platformRaw = "instagram";
    if (platformRaw === "yt") platformRaw = "youtube";

    const platform: SocialPlatform = validPlatforms.includes(platformRaw as any)
      ? (platformRaw as SocialPlatform)
      : "instagram";

    let statusRaw = (row["Status"] || row["status"] || "scheduled")
      .toString()
      .toLowerCase()
      .trim();

    const status: SocialPostStatus = validStatuses.includes(statusRaw as any)
      ? (statusRaw as SocialPostStatus)
      : "scheduled";

    const rawDate = row["Scheduled Date (YYYY-MM-DD) *"] || row["Scheduled Date"] || row["Date"] || row["scheduledAt"];
    const rawTime = row["Scheduled Time (HH:mm)"] || row["Scheduled Time"] || row["Time"];

    const scheduledDate = parseDateCell(rawDate, rawTime);

    const content = (row["Content / Caption"] || row["Content"] || row["Caption"] || row["description"] || "").toString().trim() || undefined;
    const hashtags = (row["Hashtags"] || row["Tags"] || row["hashtags"] || "").toString().trim() || undefined;
    const mediaUrl = (row["Media URL"] || row["Image URL"] || row["mediaUrl"] || "").toString().trim() || undefined;

    const reminderIntervalRaw = row["Reminder Interval (Minutes)"] || row["Reminder Interval"] || 30;
    const reminderInterval = Math.max(5, parseInt(String(reminderIntervalRaw), 10) || 30);

    let isValid = true;
    let validationError = "";

    if (!title || title.trim().length === 0) {
      isValid = false;
      validationError = "Post Title is required";
    } else if (!scheduledDate || isNaN(scheduledDate.getTime())) {
      isValid = false;
      validationError = "Valid Scheduled Date is required";
    }

    return {
      title: title.trim(),
      description: content,
      company: company || "Digiventures",
      platform,
      status,
      scheduledAt: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
      content,
      hashtags,
      mediaUrl,
      reminderInterval,
      isProcessed: status === "published",
      isValid,
      validationError,
    };
  });
}

export function exportSocialMediaPostsToCSV(posts: SocialPost[], filename = "Calendar_Posts_Export.csv") {
  const rows = posts.map((post) => ({
    "Title": post.title,
    "Company": post.company || "Digiventures",
    "Platform": post.platform,
    "Status": post.status,
    "Scheduled At": post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "-",
    "Published At": post.publishedAt ? new Date(post.publishedAt).toLocaleString() : "-",
    "Processed Status": post.isProcessed || post.status === "published" ? "Processed" : "Pending Action",
    "Content / Caption": post.content || "",
    "Hashtags": post.hashtags || "",
    "Media URL": post.mediaUrl || "",
    "Reminder Interval (Mins)": post.reminderInterval || 30,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
