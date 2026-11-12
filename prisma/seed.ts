import { PrismaClient } from "../lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.activity.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.taskProof.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.chatMessage.deleteMany();
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
      { id: "u-sneka", name: "Sneka Balan", email: "sneka@achariya.ai", password: "SnekCont@123", role: "member", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneka", department: "Content Writing & Scripts", title: "Content Writer", phone: "+91 98765 43217", joinDate: "2024-06-15", status: "active" },
      { id: "u-hari", name: "Hari", email: "hari@achariya.ai", password: "demo123", role: "member", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hari", department: "Design", title: "Graphic Designer", phone: "+91 98765 43218", joinDate: "2024-07-01", status: "active" },
      { id: "cmvy2nzka0003zkkzxev9ouqh", name: "Mohamed Ummar", email: "dme@achariya.ai", password: "admin123", role: "member", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mohamed", department: "Executive", title: "DME", phone: "+91 98765 43219", joinDate: "2026-11-01", status: "active" },
    ],
  });

  await prisma.project.createMany({
    data: [
      { id: "p1", name: "Book Preparation Work", description: "Complete book preparation including content creation, editing, formatting and review.", status: "active", priority: "high", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#6366f1", ownerId: "u1" },
      { id: "p2", name: "Video Work", description: "Scheduled video production, editing, and task assignments for team members and trainees.", status: "active", priority: "high", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#ec4899", ownerId: "u1" },
      { id: "p3", name: "App Development", description: "Mobile and web application development.", status: "active", priority: "urgent", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#10b981", ownerId: "u2" },
      { id: "p4", name: "Audio Podcast", description: "Podcast production including recording and editing.", status: "active", priority: "medium", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#f59e0b", ownerId: "u1" },
      { id: "p5", name: "AI Film Studio Agents", description: "AI-powered agents for film studio automation.", status: "active", priority: "high", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#8b5cf6", ownerId: "u2" },
      { id: "p6", name: "Shambhala Music App", description: "Music streaming and discovery app.", status: "active", priority: "high", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#06b6d4", ownerId: "u2" },
      { id: "p7", name: "RBIQ Video Work", description: "Video content for RBIQ client.", status: "active", priority: "medium", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#ef4444", ownerId: "u3" },
      { id: "p8", name: "DMR DER App", description: "Multi-platform app for 5 clients.", status: "active", priority: "urgent", startDate: "2026-11-01", endDate: "2027-03-31", progress: 0, color: "#3b82f6", ownerId: "u2" },
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

  console.log("Database reset to zero tasks and seeded with 10 @achariya.ai users & base projects!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
