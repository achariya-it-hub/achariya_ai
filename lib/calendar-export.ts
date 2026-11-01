// RFC 5545 iCalendar (.ics) exporter for meetings and calendar events

export interface ICSEvent {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime?: string | Date;
  location?: string;
  url?: string;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateICS(events: ICSEvent[], calendarName = "Digiventures Workspace"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Digiventures//Achariya CRM//EN",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((ev, idx) => {
    const start = new Date(ev.startTime);
    const end = ev.endTime ? new Date(ev.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    const now = new Date();

    lines.push(
      "BEGIN:VEVENT",
      `UID:${Date.now()}-${idx}@digiventures.com`,
      `DTSTAMP:${formatDateToICS(now)}`,
      `DTSTART:${formatDateToICS(start)}`,
      `DTEND:${formatDateToICS(end)}`,
      `SUMMARY:${(ev.title || "Meeting").replace(/[,;\\]/g, " ")}`,
      `DESCRIPTION:${(ev.description || "Digiventures CRM Event").replace(/\n/g, "\\n").replace(/[,;\\]/g, " ")}`
    );

    if (ev.location) {
      lines.push(`LOCATION:${ev.location.replace(/[,;\\]/g, " ")}`);
    }
    if (ev.url) {
      lines.push(`URL:${ev.url}`);
    }

    lines.push("STATUS:CONFIRMED", "END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICSFile(filename: string, events: ICSEvent[]) {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

