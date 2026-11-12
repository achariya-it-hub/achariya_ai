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

export type KnownCreativeType =
  | "social-media-content"
  | "video-content-scripts"
  | "advertising-campaign-content"
  | "website-digital-content"
  | "corporate-business-content"
  | "educational-academic-content"
  | "sales-lead-conversion-content"
  | "design-creative-content"
  | "events-communication"
  | "ecommerce-product-content"
  | "research-strategic-content"
  | "ai-technology-content"
  | "proof-reading"
  | "poster"
  | "reel"
  | "video"
  | "carousel"
  | "article"
  | "banner"
  | "brochure"
  | "motion"
  | "thumbnail"
  | "campaign"
  | "presentation"
  | "full-day-shoot"
  | "half-day-shoot"
  | "social-creative"
  | "landing-page"
  | "reel-script";

export type CreativeType = KnownCreativeType | (string & {});

export type TaskStage =
  | "created"
  | "assigned"
  | "accepted"
  | "in-progress"
  | "in-review"
  | "approved"
  | "completed"
  | "correction-required"
  | "correction-submitted"
  | "awaiting-approval"
  | "cancelled";

export type CreativePlatform =
  | "instagram"
  | "youtube"
  | "linkedin"
  | "meta"
  | "website"
  | "twitter"
  | "whatsapp"
  | "print"
  | "all";

export type MarketingType =
  | "Digital Marketing"
  | "Brand Marketing"
  | "Performance Marketing"
  | "Content Marketing"
  | "Event / Offline Marketing"
  | "Internal Communications"
  | "PR & Influencer Marketing";

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface TaskActivityLog {
  id: string;
  actorName: string;
  action: string;
  createdAt: string;
}

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
  workflowState?: "active" | "paused" | "returned" | "rejected" | "cancelled" | string | null;
  isPaused?: boolean;
  priority: Priority;
  assigneeId?: string;
  assignedByName?: string | null;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  completedAt?: string | null;
  order: number;
  payout: number;
  payoutStatus?: PayoutStatus;
  payoutPaidAt?: string | null;
  payoutTransactionRef?: string | null;
  reviewFeedback?: string | null;
  submissionRemarks?: string | null;
  proofNote?: string | null;
  proofs: TaskProof[];
  subtasks?: Subtask[];
  comments?: TaskComment[];
  commentsJson?: string | null;
  activityLog?: TaskActivityLog[];
  activityJson?: string | null;
  marketingType?: MarketingType | string;
  creativeType?: CreativeType;
  platform?: CreativePlatform;
  sbu?: string;
  assetCode?: string;
  taskCode?: string;
  workloadPercent?: number;
  isManualWorkload?: boolean;
  estimatedHours?: number;
  actualHours?: number;
  assignedAt?: string;
  officialDeadline?: string;
  warningDeadline?: string;
  criticalDeadline?: string;
  referenceLink?: string | null;
  driveLink?: string | null;
  finalOutputLink?: string | null;
  remarks?: string | null;
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

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  fileUrl?: string;
  fileName?: string;
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
  chatMessages?: ChatMessage[];
}
