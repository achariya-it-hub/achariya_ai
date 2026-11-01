import * as XLSX from "xlsx";
import { CalendarEvent, CalendarEventType, CalendarEventPriority } from "@/types";

export interface ParsedCalendarRow {
  title: string;
  description?: string;
  type: CalendarEventType;
  category: string;
  priority: CalendarEventPriority;
  start: string; // ISO string
  end?: string;   // ISO string
  allDay: boolean;
  location?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  reminderInterval: number; // in minutes
  isValid: boolean;
  validationError?: string;
}

export function downloadCalendarTemplate() {
  const sampleRows = [
    {
      "Title *": "Client Strategy Meeting",
      "Type": "meeting", // meeting, task, event, reminder, follow_up, call
      "Category": "Client Meeting",
      "Priority": "high", // low, medium, high, urgent
      "Start Date (YYYY-MM-DD) *": new Date(Date.now() + 86400000).toISOString().split("T")[0],
      "Start Time (HH:mm)": "10:00",
      "End Date (YYYY-MM-DD)": new Date(Date.now() + 86400000).toISOString().split("T")[0],
      "End Time (HH:mm)": "11:00",
      "All Day (TRUE/FALSE)": "FALSE",
      "Client Name": "Johnathan Doe",
      "Client Phone": "+1-555-0199",
      "Client Email": "johnathan@example.com",
      "Location": "Conference Room A / Zoom",
      "Description": "Quarterly digital marketing review and deliverables sign-off",
      "Reminder Interval (Minutes)": 15,
    },
    {
      "Title *": "Follow-up on Proposal",
      "Type": "follow_up",
      "Category": "Lead Follow-up",
      "Priority": "urgent",
      "Start Date (YYYY-MM-DD) *": new Date().toISOString().split("T")[0],
      "Start Time (HH:mm)": "14:30",
      "End Date (YYYY-MM-DD)": new Date().toISOString().split("T")[0],
      "End Time (HH:mm)": "15:00",
      "All Day (TRUE/FALSE)": "FALSE",
      "Client Name": "Sarah Jenkins",
      "Client Phone": "+1-555-0245",
      "Client Email": "sarah.j@enterprise.com",
      "Location": "Phone Call",
      "Description": "Verify contract details and answer questions regarding invoice schedule",
      "Reminder Interval (Minutes)": 30,
    },
    {
      "Title *": "Product Milestone Review",
      "Type": "task",
      "Category": "General",
      "Priority": "medium",
      "Start Date (YYYY-MM-DD) *": new Date(Date.now() + 172800000).toISOString().split("T")[0],
      "Start Time (HH:mm)": "09:00",
      "End Date (YYYY-MM-DD)": new Date(Date.now() + 172800000).toISOString().split("T")[0],
      "End Time (HH:mm)": "10:00",
      "All Day (TRUE/FALSE)": "FALSE",
      "Client Name": "Internal Team",
      "Client Phone": "",
      "Client Email": "",
      "Location": "HQ Main Hall",
      "Description": "Verify sprint outputs and product launch checklist",
      "Reminder Interval (Minutes)": 60,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);

  // Set column widths for readability
  worksheet["!cols"] = [
    { wch: 28 }, // Title
    { wch: 14 }, // Type
    { wch: 18 }, // Category
    { wch: 12 }, // Priority
    { wch: 24 }, // Start Date
    { wch: 18 }, // Start Time
    { wch: 22 }, // End Date
    { wch: 18 }, // End Time
    { wch: 20 }, // All Day
    { wch: 22 }, // Client Name
    { wch: 18 }, // Client Phone
    { wch: 26 }, // Client Email
    { wch: 28 }, // Location
    { wch: 45 }, // Description
    { wch: 26 }, // Reminder Interval
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Calendar Import Template");

  XLSX.writeFile(workbook, "Calendar_Bulk_Import_Template.xlsx");
}

function parseDateCell(rawDate: any, rawTime?: any): Date | null {
  if (!rawDate) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  if (typeof rawDate === "number") {
    // Excel serial date format
    const parsed = XLSX.SSF.parse_date_code(rawDate);
    if (parsed) {
      year = parsed.y;
      month = parsed.m - 1;
      day = parsed.d;
    }
  } else if (typeof rawDate === "string") {
    const cleanStr = rawDate.trim();
    // Try YYYY-MM-DD or DD/MM/YYYY or standard ISO
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

  let hours = 9;
  let minutes = 0;

  if (rawTime) {
    if (typeof rawTime === "string") {
      const timeParts = rawTime.trim().split(":");
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    } else if (typeof rawTime === "number") {
      // Excel fraction of a day
      const totalSeconds = Math.round(rawTime * 86400);
      hours = Math.floor(totalSeconds / 3600);
      minutes = Math.floor((totalSeconds % 3600) / 60);
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

export async function parseCalendarExcel(file: File): Promise<ParsedCalendarRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  return rawRows.map((row) => {
    // Flexible header mapping
    const title =
      row["Title *"] ||
      row["Title"] ||
      row["title"] ||
      row["Subject"] ||
      row["Name"] ||
      row["Event"] ||
      "";

    const typeRaw = (row["Type"] || row["type"] || "event").toString().toLowerCase().trim();
    let type: CalendarEventType = "event";
    if (["meeting", "task", "milestone", "event", "reminder", "follow_up", "call", "social", "leave"].includes(typeRaw)) {
      type = typeRaw as CalendarEventType;
    } else if (typeRaw.includes("meet")) {
      type = "meeting";
    } else if (typeRaw.includes("call")) {
      type = "call";
    } else if (typeRaw.includes("follow")) {
      type = "follow_up";
    } else if (typeRaw.includes("remind")) {
      type = "reminder";
    }

    const priorityRaw = (row["Priority"] || row["priority"] || "medium").toString().toLowerCase().trim();
    let priority: CalendarEventPriority = "medium";
    if (["low", "medium", "high", "urgent"].includes(priorityRaw)) {
      priority = priorityRaw as CalendarEventPriority;
    }

    const category = (row["Category"] || row["category"] || "General").toString().trim();
    const rawStartDate = row["Start Date (YYYY-MM-DD) *"] || row["Start Date"] || row["Date"] || row["start"];
    const rawStartTime = row["Start Time (HH:mm)"] || row["Start Time"] || row["Time"];
    const rawEndDate = row["End Date (YYYY-MM-DD)"] || row["End Date"] || row["end"];
    const rawEndTime = row["End Time (HH:mm)"] || row["End Time"];
    const allDayRaw = row["All Day (TRUE/FALSE)"] || row["All Day"] || false;
    const allDay = String(allDayRaw).toUpperCase() === "TRUE" || allDayRaw === true;

    const startDate = parseDateCell(rawStartDate, rawStartTime);
    const endDate = rawEndDate ? parseDateCell(rawEndDate, rawEndTime) : null;

    const clientName = (row["Client Name"] || row["Customer"] || row["Contact Name"] || "").toString().trim() || undefined;
    const clientPhone = (row["Client Phone"] || row["Phone"] || row["Mobile"] || "").toString().trim() || undefined;
    const clientEmail = (row["Client Email"] || row["Email"] || "").toString().trim() || undefined;
    const location = (row["Location"] || row["Place"] || row["Venue"] || "").toString().trim() || undefined;
    const description = (row["Description"] || row["Notes"] || row["Details"] || "").toString().trim() || undefined;

    const reminderIntervalRaw = row["Reminder Interval (Minutes)"] || row["Reminder Interval"] || row["Reminder (Min)"] || 15;
    const reminderInterval = Math.max(5, parseInt(String(reminderIntervalRaw), 10) || 15);

    let isValid = true;
    let validationError = "";

    if (!title || title.trim().length === 0) {
      isValid = false;
      validationError = "Title is required";
    } else if (!startDate || isNaN(startDate.getTime())) {
      isValid = false;
      validationError = "Valid Start Date is required";
    }

    return {
      title: title.trim(),
      description,
      type,
      category,
      priority,
      start: startDate ? startDate.toISOString() : new Date().toISOString(),
      end: endDate ? endDate.toISOString() : undefined,
      allDay,
      location,
      clientName,
      clientPhone,
      clientEmail,
      reminderInterval,
      isValid,
      validationError,
    };
  });
}

export function exportCalendarToExcel(events: CalendarEvent[], filename = "Calendar_Export.xlsx") {
  const rows = events.map((ev) => ({
    "ID": ev.id,
    "Title": ev.title,
    "Status": ev.isProcessed ? "PROCESSED" : "PENDING (UNPROCESSED)",
    "Processed Date": ev.processedAt ? new Date(ev.processedAt).toLocaleString() : "Not Processed",
    "Processed By": ev.processedBy || "-",
    "Type": ev.type,
    "Category": ev.category || "General",
    "Priority": ev.priority || "medium",
    "Start Time": new Date(ev.start).toLocaleString(),
    "End Time": ev.end ? new Date(ev.end).toLocaleString() : "-",
    "Client Name": ev.clientName || "-",
    "Client Phone": ev.clientPhone || "-",
    "Client Email": ev.clientEmail || "-",
    "Location": ev.location || "-",
    "Reminder Interval (Min)": ev.reminderInterval || 15,
    "Reminder Count": ev.reminderCount || 0,
    "Source": ev.source || "manual",
    "Description": ev.description || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Calendar Events");
  XLSX.writeFile(workbook, filename);
}
