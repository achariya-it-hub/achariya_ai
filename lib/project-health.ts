import { Project, Task } from "@/types";

export type HealthStatus = "healthy" | "warning" | "critical";

export interface ProjectHealth {
  status: HealthStatus;
  score: number; // 0 - 100
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
  reasons: string[];
}

export function calculateProjectHealth(project: Project, tasks: Task[]): ProjectHealth {
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const total = projectTasks.length;
  
  if (total === 0) {
    return {
      status: "healthy",
      score: 100,
      label: "On Track",
      color: "text-emerald-700",
      bgLight: "bg-emerald-50",
      borderColor: "border-emerald-200",
      reasons: ["No pending blockers"],
    };
  }

  const done = projectTasks.filter((t) => t.status === "done").length;
  const overdue = projectTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
  ).length;
  const inReview = projectTasks.filter((t) => t.status === "review").length;
  
  const completionRate = Math.round((done / total) * 100);
  const now = new Date();
  const endDate = new Date(project.endDate);
  const isPastDeadline = endDate < now && project.status !== "completed";

  let score = 100;
  const reasons: string[] = [];

  // Deduct for overdue tasks
  if (overdue > 0) {
    score -= overdue * 15;
    reasons.push(`${overdue} overdue task${overdue > 1 ? "s" : ""}`);
  }

  // Deduct if past project deadline
  if (isPastDeadline) {
    score -= 30;
    reasons.push("Past scheduled completion deadline");
  }

  // Deduct if review backlog is heavy
  if (inReview > 3) {
    score -= 10;
    reasons.push(`${inReview} tasks awaiting review`);
  }

  // Clamp score between 10 and 100
  score = Math.max(10, Math.min(100, score));

  if (score >= 80) {
    return {
      status: "healthy",
      score,
      label: "Healthy · On Track",
      color: "text-emerald-700",
      bgLight: "bg-emerald-50",
      borderColor: "border-emerald-200",
      reasons: reasons.length ? reasons : ["Progress aligns with schedule"],
    };
  }

  if (score >= 55) {
    return {
      status: "warning",
      score,
      label: "Needs Attention",
      color: "text-amber-700",
      bgLight: "bg-amber-50",
      borderColor: "border-amber-200",
      reasons,
    };
  }

  return {
    status: "critical",
    score,
    label: "Critical Delay",
    color: "text-rose-700",
    bgLight: "bg-rose-50",
    borderColor: "border-rose-200",
    reasons,
  };
}

