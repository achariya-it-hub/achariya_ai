import { PrismaClient } from "../lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.activity.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: "u1", name: "Athiyaman", email: "athiyaman@achariya.ai", password: "demo123", role: "admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Athiyaman", department: "Executive", title: "Operations Admin", phone: "+91 98765 43210", joinDate: "2024-01-10", status: "active" },
      { id: "u2", name: "Bala", email: "bala@achariya.ai", password: "demo123", role: "admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bala", department: "Engineering", title: "Technical Admin", phone: "+91 98765 43211", joinDate: "2024-01-10", status: "active" },
      { id: "u3", name: "Ramkumar", email: "ramkumar@achariya.ai", password: "demo123", role: "admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ramkumar", department: "Media Production", title: "Media Admin", phone: "+91 98765 43212", joinDate: "2024-03-15", status: "active" },
      { id: "u6", name: "JEEVANESH", email: "jeevanesh@achariya.ai", password: "demo123", role: "trainee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jeevanesh", department: "Engineering", title: "Frontend Trainee", phone: "+91 98765 43213", joinDate: "2024-05-01", status: "active" },
      { id: "u7", name: "SIVA", email: "siva@achariya.ai", password: "demo123", role: "trainee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siva", department: "Media Production", title: "Video Editing Trainee", phone: "+91 98765 43214", joinDate: "2024-05-01", status: "active" },
      { id: "u8", name: "ADHITHYA", email: "adhi@achariya.ai", password: "demo123", role: "trainee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adhithya", department: "Design", title: "UI/UX Trainee", phone: "+91 98765 43215", joinDate: "2024-05-15", status: "active" },
      { id: "u9", name: "ALBERT", email: "albert@achariya.ai", password: "demo123", role: "trainee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Albert", department: "Content & Media", title: "Content Writing Trainee", phone: "+91 98765 43216", joinDate: "2024-06-01", status: "active" },
    ],
  });

  await prisma.project.createMany({
    data: [
      { id: "p1", name: "Book Preparation Work", description: "Complete book preparation including content creation, editing, formatting and review.", status: "active", priority: "high", startDate: "2025-06-01", endDate: "2025-08-30", progress: 35, color: "#6366f1", ownerId: "u1" },
      { id: "p2", name: "Video Work", description: "Scheduled video production, editing, and task assignments for team members and trainees.", status: "active", priority: "high", startDate: "2025-07-01", endDate: "2025-09-30", progress: 35, color: "#ec4899", ownerId: "u1" },
      { id: "p3", name: "App Development", description: "Mobile and web application development.", status: "active", priority: "urgent", startDate: "2025-05-01", endDate: "2025-10-31", progress: 40, color: "#10b981", ownerId: "u2" },
      { id: "p4", name: "Audio Podcast", description: "Podcast production including recording and editing.", status: "active", priority: "medium", startDate: "2025-07-01", endDate: "2025-12-31", progress: 10, color: "#f59e0b", ownerId: "u1" },
      { id: "p5", name: "AI Film Studio Agents", description: "AI-powered agents for film studio automation.", status: "active", priority: "high", startDate: "2025-06-10", endDate: "2025-11-30", progress: 25, color: "#8b5cf6", ownerId: "u2" },
      { id: "p6", name: "Shambhala Music App", description: "Music streaming and discovery app.", status: "active", priority: "high", startDate: "2025-05-15", endDate: "2025-09-15", progress: 50, color: "#06b6d4", ownerId: "u2" },
      { id: "p7", name: "RBIQ Video Work", description: "Video content for RBIQ client.", status: "active", priority: "medium", startDate: "2025-07-01", endDate: "2025-08-31", progress: 15, color: "#ef4444", ownerId: "u3" },
      { id: "p8", name: "DMR DER App", description: "Multi-platform app for 5 clients.", status: "active", priority: "urgent", startDate: "2025-04-01", endDate: "2025-12-31", progress: 30, color: "#3b82f6", ownerId: "u2" },
    ],
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: "p1", userId: "u1" }, { projectId: "p1", userId: "u9" },
      { projectId: "p2", userId: "u1" }, { projectId: "p2", userId: "u2" }, { projectId: "p2", userId: "u3" }, { projectId: "p2", userId: "u6" }, { projectId: "p2", userId: "u7" }, { projectId: "p2", userId: "u8" }, { projectId: "p2", userId: "u9" },
      { projectId: "p3", userId: "u2" }, { projectId: "p3", userId: "u6" },
      { projectId: "p4", userId: "u1" }, { projectId: "p4", userId: "u9" },
      { projectId: "p5", userId: "u2" },
      { projectId: "p6", userId: "u2" }, { projectId: "p6", userId: "u8" },
      { projectId: "p7", userId: "u3" }, { projectId: "p7", userId: "u7" },
      { projectId: "p8", userId: "u2" }, { projectId: "p8", userId: "u8" },
    ],
  });

  await prisma.milestone.createMany({
    data: [
      { id: "m1", projectId: "p1", title: "Content Outline", description: "Finalize book chapter structure", dueDate: "2025-06-20", status: "completed" },
      { id: "m2", projectId: "p1", title: "First Draft", description: "Complete first draft of all chapters", dueDate: "2025-07-30", status: "in-progress" },
      { id: "m3", projectId: "p2", title: "Intern Recruitment", description: "Recruit interns for video support", dueDate: "2025-07-15", status: "in-progress" },
      { id: "m4", projectId: "p2", title: "Video Works Schedule (DAY1 - DAY48)", description: "Complete set of scheduled 48 Video Works tasks", dueDate: "2025-08-31", status: "in-progress" },
      { id: "m5", projectId: "p3", title: "Core Features", description: "Build core app features", dueDate: "2025-07-31", status: "in-progress" },
      { id: "m6", projectId: "p5", title: "Agent Prototype", description: "Working AI agent prototype", dueDate: "2025-08-15", status: "in-progress" },
      { id: "m7", projectId: "p6", title: "MVP Release", description: "Minimum viable product launch", dueDate: "2025-07-31", status: "in-progress" },
      { id: "m8", projectId: "p8", title: "Platform Delivery", description: "Deliver all 5 client apps", dueDate: "2025-09-30", status: "upcoming" },
    ],
  });

  await prisma.task.createMany({
    data: [
      // Tasks assigned to Athiyaman (u1), Bala (u2), Ramkumar (u3)
      { id: "t1", projectId: "p1", milestoneId: "m1", title: "Research target audience", description: "Identify target readers", status: "done", priority: "high", assigneeId: "u1", dueDate: "2025-06-10", order: 0, payout: 0 },
      { id: "t2", projectId: "p1", milestoneId: "m2", title: "Write chapter 1-3", description: "Draft first three chapters", status: "in-progress", priority: "high", assigneeId: "u1", dueDate: "2025-07-10", order: 0, payout: 0 },
      { id: "t3", projectId: "p1", milestoneId: "m2", title: "Write chapter 4-6", description: "Draft chapters four through six", status: "todo", priority: "medium", assigneeId: "u1", dueDate: "2025-07-25", order: 1, payout: 0 },
      { id: "t4", projectId: "p2", milestoneId: "m3", title: "Post intern job listings", description: "Publish internship postings", status: "in-progress", priority: "urgent", assigneeId: "u1", dueDate: "2025-07-05", order: 0, payout: 0 },
      { id: "t5", projectId: "p2", milestoneId: "m3", title: "Interview candidates", description: "Screen shortlisted interns", status: "todo", priority: "high", assigneeId: "u1", dueDate: "2025-07-12", order: 1, payout: 0 },
      { id: "t6", projectId: "p2", milestoneId: "m4", title: "Script video episodes", description: "Write scripts for 5 episodes", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-08-15", order: 2, payout: 0 },
      { id: "t7", projectId: "p3", milestoneId: "m5", title: "API architecture design", description: "Design REST API endpoints", status: "done", priority: "high", assigneeId: "u2", dueDate: "2025-06-15", order: 0, payout: 0 },
      { id: "t8", projectId: "p3", milestoneId: "m5", title: "Build authentication module", description: "User auth and sessions", status: "in-progress", priority: "urgent", assigneeId: "u2", dueDate: "2025-07-05", order: 1, payout: 0 },
      { id: "t9", projectId: "p3", milestoneId: "m5", title: "Dashboard UI development", description: "Build main dashboard screens", status: "todo", priority: "high", assigneeId: "u2", dueDate: "2025-07-20", order: 2, payout: 0 },
      { id: "t10", projectId: "p4", title: "Record first episode", description: "Record intro episode", status: "backlog", priority: "medium", assigneeId: "u1", dueDate: "2025-07-15", order: 0, payout: 0 },
      { id: "t11", projectId: "p5", milestoneId: "m6", title: "Research AI frameworks", description: "Evaluate LangChain, CrewAI", status: "done", priority: "high", assigneeId: "u2", dueDate: "2025-06-25", order: 0, payout: 0 },
      { id: "t12", projectId: "p5", milestoneId: "m6", title: "Build agent pipeline", description: "Core AI agent pipeline", status: "in-progress", priority: "urgent", assigneeId: "u2", dueDate: "2025-07-30", order: 1, payout: 0 },
      { id: "t13", projectId: "p5", milestoneId: "m6", title: "Integrate with studio tools", description: "Connect to video tools", status: "todo", priority: "high", assigneeId: "u2", dueDate: "2025-08-10", order: 2, payout: 0 },
      { id: "t14", projectId: "p6", milestoneId: "m7", title: "Music library integration", description: "Integrate streaming APIs", status: "done", priority: "high", assigneeId: "u2", dueDate: "2025-06-20", order: 0, payout: 0 },
      { id: "t15", projectId: "p6", milestoneId: "m7", title: "Build player UI", description: "Design music player interface", status: "in-progress", priority: "high", assigneeId: "u2", dueDate: "2025-07-15", order: 1, payout: 0 },
      { id: "t16", projectId: "p6", milestoneId: "m7", title: "Recommendation engine", description: "AI music recommendations", status: "todo", priority: "medium", assigneeId: "u2", dueDate: "2025-07-25", order: 2, payout: 0 },
      { id: "t17", projectId: "p7", title: "Plan video shoot schedule", description: "Create shooting schedule", status: "in-progress", priority: "high", assigneeId: "u3", dueDate: "2025-07-10", order: 0, payout: 0 },
      { id: "t18", projectId: "p7", title: "Edit first batch", description: "Edit RBIQ videos", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-08-05", order: 1, payout: 0 },
      { id: "t19", projectId: "p8", milestoneId: "m8", title: "Qschool app build", description: "Develop Qschool version", status: "in-progress", priority: "high", assigneeId: "u2", dueDate: "2025-08-01", order: 0, payout: 0 },
      { id: "t20", projectId: "p8", milestoneId: "m8", title: "Bushido app build", description: "Develop Bushido version", status: "in-progress", priority: "high", assigneeId: "u2", dueDate: "2025-08-15", order: 1, payout: 0 },
      { id: "t21", projectId: "p8", milestoneId: "m8", title: "Heguru app build", description: "Develop Heguru version", status: "todo", priority: "medium", assigneeId: "u2", dueDate: "2025-09-01", order: 2, payout: 0 },
      { id: "t22", projectId: "p8", milestoneId: "m8", title: "WOW app build", description: "Develop WOW version", status: "todo", priority: "medium", assigneeId: "u2", dueDate: "2025-09-15", order: 3, payout: 0 },
      { id: "t23", projectId: "p8", milestoneId: "m8", title: "RBIQ app build", description: "Develop RBIQ version", status: "backlog", priority: "high", assigneeId: "u2", dueDate: "2025-09-30", order: 4, payout: 0 },

      // Trainee tasks with payouts
      { id: "t24", projectId: "p3", milestoneId: "m5", title: "Navigation Bar & Account Layout", description: "Develop responsive account view & navigation layout", status: "done", priority: "high", assigneeId: "u6", dueDate: "2025-06-18", order: 3, payout: 1500 },
      { id: "t25", projectId: "p3", milestoneId: "m5", title: "User Payout Account UI Components", description: "Create task payout summary cards and account statement table", status: "in-progress", priority: "urgent", assigneeId: "u6", dueDate: "2025-07-10", order: 4, payout: 2000 },
      { id: "t26", projectId: "p2", milestoneId: "m4", title: "Video Color Grading & Rough Cut", description: "Perform color correction and audio sync for video episode 1", status: "done", priority: "high", assigneeId: "u3", dueDate: "2025-06-25", order: 3, payout: 1200 },
      { id: "t27", projectId: "p7", title: "RBIQ Client Motion Graphics Short", description: "Design and animate 30-second promo graphic clip", status: "in-progress", priority: "medium", assigneeId: "u3", dueDate: "2025-07-15", order: 2, payout: 800 },
      { id: "t30", projectId: "p1", milestoneId: "m1", title: "Proofreading & Formatting Chapter 1-2", description: "Review grammar, typography layout, and image captions", status: "done", priority: "medium", assigneeId: "u9", dueDate: "2025-06-22", order: 2, payout: 750 },
      { id: "t31", projectId: "p4", title: "Podcast Episode 1 Show Notes & Transcript", description: "Generate full transcript and write summary bullet points", status: "in-progress", priority: "high", assigneeId: "u9", dueDate: "2025-07-18", order: 1, payout: 950 },

      // Scheduled 48 Video Works tasks
      { id: "v1", projectId: "p2", milestoneId: "m4", title: "DAY1", description: "Video Work DAY1", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-01", order: 1, payout: 0, proofNote: "Uploaded video DAY1" },
      { id: "v2", projectId: "p2", milestoneId: "m4", title: "DAY2", description: "Video Work DAY2", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-02", order: 2, payout: 0, proofNote: "Uploaded video DAY2" },
      { id: "v3", projectId: "p2", milestoneId: "m4", title: "DAY3", description: "Video Work DAY3", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-03", order: 3, payout: 0, proofNote: "Uploaded video DAY3" },
      { id: "v4", projectId: "p2", milestoneId: "m4", title: "DAY4", description: "Video Work DAY4", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-04", order: 4, payout: 0, proofNote: "Uploaded video DAY4" },
      { id: "v5", projectId: "p2", milestoneId: "m4", title: "DAY5", description: "Video Work DAY5", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-05", order: 5, payout: 0, proofNote: "Uploaded video DAY5" },
      { id: "v6", projectId: "p2", milestoneId: "m4", title: "DAY6", description: "Video Work DAY6", status: "done", priority: "high", assigneeId: "u8", dueDate: "2025-07-06", order: 6, payout: 50, proofNote: "Uploaded video DAY6" },
      { id: "v7", projectId: "p2", milestoneId: "m4", title: "DAY7", description: "Video Work DAY7", status: "done", priority: "high", assigneeId: "u7", dueDate: "2025-07-07", order: 7, payout: 50, proofNote: "Uploaded video DAY7" },
      { id: "v8", projectId: "p2", milestoneId: "m4", title: "DAY8", description: "Video Work DAY8", status: "done", priority: "high", assigneeId: "u6", dueDate: "2025-07-08", order: 8, payout: 50, proofNote: "Uploaded video DAY8" },
      { id: "v9", projectId: "p2", milestoneId: "m4", title: "DAY9", description: "Video Work DAY9", status: "done", priority: "high", assigneeId: "u7", dueDate: "2025-07-09", order: 9, payout: 50, proofNote: "Uploaded video DAY9" },
      { id: "v10", projectId: "p2", milestoneId: "m4", title: "DAY10", description: "Video Work DAY10", status: "done", priority: "high", assigneeId: "u6", dueDate: "2025-07-10", order: 10, payout: 50, proofNote: "Uploaded video DAY10" },
      { id: "v11", projectId: "p2", milestoneId: "m4", title: "DAY11", description: "Video Work DAY11", status: "done", priority: "medium", assigneeId: "u8", dueDate: "2025-07-11", order: 11, payout: 50, proofNote: "Uploaded video DAY11" },
      { id: "v12", projectId: "p2", milestoneId: "m4", title: "DAY12", description: "Video Work DAY12", status: "done", priority: "medium", assigneeId: "u8", dueDate: "2025-07-12", order: 12, payout: 50, proofNote: "Uploaded video DAY12" },
      { id: "v13", projectId: "p2", milestoneId: "m4", title: "DAY13", description: "Video Work DAY13", status: "in-progress", priority: "medium", assigneeId: "u8", dueDate: "2025-07-13", order: 13, payout: 0 },
      { id: "v14", projectId: "p2", milestoneId: "m4", title: "DAY14", description: "Video Work DAY14", status: "in-progress", priority: "medium", assigneeId: "u6", dueDate: "2025-07-14", order: 14, payout: 0 },
      { id: "v15", projectId: "p2", milestoneId: "m4", title: "DAY15", description: "Video Work DAY15", status: "done", priority: "high", assigneeId: "u7", dueDate: "2025-07-15", order: 15, payout: 50, proofNote: "Uploaded video DAY15" },
      { id: "v16", projectId: "p2", milestoneId: "m4", title: "DAY16", description: "Video Work DAY16", status: "done", priority: "high", assigneeId: "u9", dueDate: "2025-07-16", order: 16, payout: 50, proofNote: "Uploaded video DAY16" },
      { id: "v17", projectId: "p2", milestoneId: "m4", title: "DAY17", description: "Video Work DAY17", status: "in-progress", priority: "medium", assigneeId: "u6", dueDate: "2025-07-17", order: 17, payout: 0 },
      { id: "v18", projectId: "p2", milestoneId: "m4", title: "DAY18", description: "Video Work DAY18", status: "in-progress", priority: "medium", assigneeId: "u7", dueDate: "2025-07-18", order: 18, payout: 0 },
      { id: "v19", projectId: "p2", milestoneId: "m4", title: "DAY19", description: "Video Work DAY19", status: "in-progress", priority: "medium", assigneeId: "u9", dueDate: "2025-07-19", order: 19, payout: 0 },
      { id: "v20", projectId: "p2", milestoneId: "m4", title: "DAY20", description: "Video Work DAY20", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-20", order: 20, payout: 0, proofNote: "Uploaded video DAY20" },
      { id: "v21", projectId: "p2", milestoneId: "m4", title: "DAY21", description: "Video Work DAY21", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-21", order: 21, payout: 0, proofNote: "Uploaded video DAY21" },
      { id: "v22", projectId: "p2", milestoneId: "m4", title: "DAY22", description: "Video Work DAY22", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-22", order: 22, payout: 0, proofNote: "Uploaded video DAY22" },
      { id: "v23", projectId: "p2", milestoneId: "m4", title: "DAY23", description: "Video Work DAY23", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-23", order: 23, payout: 0 },
      { id: "v24", projectId: "p2", milestoneId: "m4", title: "DAY24", description: "Video Work DAY24", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-24", order: 24, payout: 0 },
      { id: "v25", projectId: "p2", milestoneId: "m4", title: "DAY25", description: "Video Work DAY25", status: "done", priority: "medium", assigneeId: "u3", dueDate: "2025-07-25", order: 25, payout: 0 },
      { id: "v26", projectId: "p2", milestoneId: "m4", title: "DAY26", description: "Video Work DAY26", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-07-26", order: 26, payout: 0 },
      { id: "v27", projectId: "p2", milestoneId: "m4", title: "DAY27", description: "Video Work DAY27", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-07-27", order: 27, payout: 0 },
      { id: "v28", projectId: "p2", milestoneId: "m4", title: "DAY28", description: "Video Work DAY28", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-07-28", order: 28, payout: 0 },
      { id: "v29", projectId: "p2", milestoneId: "m4", title: "DAY29", description: "Video Work DAY29", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-07-29", order: 29, payout: 0 },
      { id: "v30", projectId: "p2", milestoneId: "m4", title: "DAY30", description: "Video Work DAY30", status: "todo", priority: "medium", assigneeId: "u3", dueDate: "2025-07-30", order: 30, payout: 0 },
      { id: "v31", projectId: "p2", milestoneId: "m4", title: "DAY31", description: "Video Work DAY31", status: "done", priority: "high", assigneeId: "u6", dueDate: "2025-07-31", order: 31, payout: 50, proofNote: "Uploaded video DAY31" },
      { id: "v32", projectId: "p2", milestoneId: "m4", title: "DAY32", description: "Video Work DAY32", status: "done", priority: "high", assigneeId: "u6", dueDate: "2025-08-01", order: 32, payout: 50, proofNote: "Uploaded video DAY32" },
      { id: "v33", projectId: "p2", milestoneId: "m4", title: "DAY33", description: "Video Work DAY33", status: "todo", priority: "medium", assigneeId: "u6", dueDate: "2025-08-02", order: 33, payout: 0 },
      { id: "v34", projectId: "p2", milestoneId: "m4", title: "DAY34", description: "Video Work DAY34", status: "todo", priority: "medium", assigneeId: "u6", dueDate: "2025-08-03", order: 34, payout: 0 },
      { id: "v35", projectId: "p2", milestoneId: "m4", title: "DAY35", description: "Video Work DAY35", status: "todo", priority: "medium", assigneeId: "u6", dueDate: "2025-08-04", order: 35, payout: 0 },
      { id: "v36", projectId: "p2", milestoneId: "m4", title: "DAY36", description: "Video Work DAY36", status: "done", priority: "high", assigneeId: "u7", dueDate: "2025-08-05", order: 36, payout: 50, proofNote: "Uploaded video DAY36" },
      { id: "v37", projectId: "p2", milestoneId: "m4", title: "DAY37", description: "Video Work DAY37", status: "done", priority: "high", assigneeId: "u7", dueDate: "2025-08-06", order: 37, payout: 50, proofNote: "Uploaded video DAY37" },
      { id: "v38", projectId: "p2", milestoneId: "m4", title: "DAY38", description: "Video Work DAY38", status: "done", priority: "high", assigneeId: "u7", dueDate: "2025-08-07", order: 38, payout: 50, proofNote: "Uploaded video DAY38" },
      { id: "v39", projectId: "p2", milestoneId: "m4", title: "DAY39", description: "Video Work DAY39", status: "todo", priority: "medium", assigneeId: "u7", dueDate: "2025-08-08", order: 39, payout: 0 },
      { id: "v40", projectId: "p2", milestoneId: "m4", title: "DAY40", description: "Video Work DAY40", status: "todo", priority: "medium", assigneeId: "u7", dueDate: "2025-08-09", order: 40, payout: 0 },
      { id: "v41", projectId: "p2", milestoneId: "m4", title: "DAY41", description: "Video Work DAY41", status: "todo", priority: "medium", assigneeId: "u8", dueDate: "2025-08-10", order: 41, payout: 0 },
      { id: "v42", projectId: "p2", milestoneId: "m4", title: "DAY42", description: "Video Work DAY42", status: "todo", priority: "medium", assigneeId: "u8", dueDate: "2025-08-11", order: 42, payout: 0 },
      { id: "v43", projectId: "p2", milestoneId: "m4", title: "DAY43", description: "Video Work DAY43", status: "todo", priority: "medium", assigneeId: "u8", dueDate: "2025-08-12", order: 43, payout: 0 },
      { id: "v44", projectId: "p2", milestoneId: "m4", title: "DAY44", description: "Video Work DAY44", status: "todo", priority: "medium", assigneeId: "u8", dueDate: "2025-08-13", order: 44, payout: 0 },
      { id: "v45", projectId: "p2", milestoneId: "m4", title: "DAY45", description: "Video Work DAY45", status: "todo", priority: "medium", assigneeId: "u8", dueDate: "2025-08-14", order: 45, payout: 0 },
      { id: "v46", projectId: "p2", milestoneId: "m4", title: "DAY46", description: "Video Work DAY46", status: "done", priority: "high", assigneeId: "u9", dueDate: "2025-08-15", order: 46, payout: 50, proofNote: "Uploaded video DAY46" },
      { id: "v47", projectId: "p2", milestoneId: "m4", title: "DAY47", description: "Video Work DAY47", status: "todo", priority: "medium", assigneeId: "u9", dueDate: "2025-08-16", order: 47, payout: 0 },
      { id: "v48", projectId: "p2", milestoneId: "m4", title: "DAY48", description: "Video Work DAY48", status: "todo", priority: "medium", assigneeId: "u9", dueDate: "2025-08-17", order: 48, payout: 0 },
    ],
  });

  console.log("Database seeded successfully!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
