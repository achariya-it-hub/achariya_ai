export type UserRole = "admin" | "manager" | "member" | "trainee";

export type EmployeeStatus = "active" | "inactive" | "on-leave";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  proofNote?: string | null;
  proofs: TaskProof[];
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

export interface CRMData {
  members: TeamMember[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  meetings: Meeting[];
  activities: Activity[];
}
