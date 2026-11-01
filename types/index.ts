export type UserRole = "admin" | "manager" | "member" | "trainee";

export type EmployeeStatus = "active" | "inactive" | "on-leave";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  avatar?: string;
  password?: string;
  department: string;
  title: string;
  phone: string;
  joinDate: string;
  status: EmployeeStatus;
  attendanceEnabled?: boolean;
}

export type ProjectStatus = "active" | "completed" | "on-hold" | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  business?: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  endDate: string;
  progress: number;
  budget?: number;
  ownerId: string;
  memberIds: string[];
  color: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  status: "upcoming" | "in-progress" | "completed" | "overdue";
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type PayoutStatus = "pending" | "approved" | "paid";

export type CreativeType = "poster" | "reel" | "video" | "carousel" | "article" | "banner";
export type CreativePlatform = "instagram" | "youtube" | "linkedin" | "meta" | "website" | "twitter";

export interface TaskProof {
  id: string;
  taskId: string;
  name?: string | null;
  url: string;
  type: "link" | "upload";
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  order: number;
  payout: number;
  payoutStatus?: PayoutStatus;
  payoutPaidAt?: string | null;
  payoutTransactionRef?: string | null;
  reviewFeedback?: string | null;
  proofNote?: string | null;
  proofs: TaskProof[];
  subtasks?: Subtask[];
  creativeType?: CreativeType;
  platform?: CreativePlatform;
  sbu?: string;
  assetCode?: string;
  taskCode?: string;
  estimatedHours?: number;
  actualHours?: number;
  referenceLink?: string | null;
  driveLink?: string | null;
  finalOutputLink?: string | null;
}

export interface CRMNotification {
  id: string;
  title: string;
  message: string;
  type: "task" | "approval" | "payout" | "meeting" | "system";
  link?: string;
  read: boolean;
  createdAt: string;
  userId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  roomName: string;
  hostId: string;
  attendeeIds: string[];
  status: "scheduled" | "live" | "ended";
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  target: string;
  targetId: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt?: string | null;
}

export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "twitter" | "youtube" | "tiktok" | "pinterest" | "other";
export type SocialPostStatus = "idea" | "draft" | "scheduled" | "published" | "archived";

export interface SocialPost {
  id: string;
  title: string;
  description?: string | null;
  company?: string | null;
  platform: SocialPlatform;
  status: SocialPostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  postUrl?: string | null;
  createdById?: string | null;
  assigneeId?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  hashtags?: string | null;
  isProcessed?: boolean;
  reminderInterval?: number;
  lastRemindedAt?: string | null;
  snoozedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventType = "meeting" | "task" | "milestone" | "event" | "reminder" | "follow_up" | "call" | "social" | "leave";
export type CalendarEventStatus = "pending" | "in_progress" | "processed" | "completed" | "cancelled" | "upcoming" | "ongoing" | "done";
export type CalendarEventPriority = "low" | "medium" | "high" | "urgent";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  company?: string | null;
  type: CalendarEventType;
  category?: string;
  priority?: CalendarEventPriority;
  status: CalendarEventStatus;
  isProcessed: boolean;
  processedAt?: string | null;
  processedBy?: string | null;
  start: string;
  end?: string | null;
  allDay?: boolean;
  location?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  reminderInterval?: number;
  reminderUnit?: "minutes" | "hours" | "days";
  lastRemindedAt?: string | null;
  snoozedUntil?: string | null;
  reminderCount?: number;
  assigneeId?: string | null;
  projectId?: string | null;
  color?: string | null;
  source?: "manual" | "excel_import" | "whatsapp";
  createdAt: string;
  updatedAt: string;
}

export interface CRMData {
  members: TeamMember[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  meetings: Meeting[];
  activities: Activity[];
  attendance: AttendanceRecord[];
  socialPosts?: SocialPost[];
  calendarEvents?: CalendarEvent[];
}
