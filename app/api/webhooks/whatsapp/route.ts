import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  try {
    const config = await prisma.whatsappConfig.findUnique({ where: { id: "default" } });
    const verifyToken = config?.webhookToken || "wh_token_achariya_crm";

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge || "OK", { status: 200 });
    }
  } catch (err) {
    console.error("WhatsApp webhook GET error:", err);
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Extract message details from Meta Cloud API format or generic format
    let senderPhone = "";
    let senderName = "";
    let rawMessage = "";
    let groupId = "";

    if (body?.entry?.[0]?.changes?.[0]?.value) {
      const changeVal = body.entry[0].changes[0].value;
      const msg = changeVal.messages?.[0];
      const contact = changeVal.contacts?.[0];
      senderPhone = msg?.from || contact?.wa_id || "";
      senderName = contact?.profile?.name || "";
      rawMessage = msg?.text?.body || msg?.caption || "";
      groupId = msg?.groupId || changeVal?.metadata?.display_phone_number || "group-crm-main";
    } else {
      senderPhone = body.from || body.senderPhone || body.phone || "";
      senderName = body.senderName || body.name || "";
      rawMessage = body.message || body.text || body.rawMessage || "";
      groupId = body.groupId || body.group || "group-crm-main";
    }

    if (!rawMessage) {
      return NextResponse.json({ error: "No message text provided" }, { status: 400 });
    }

    // 2. Fetch config
    let config = await prisma.whatsappConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.whatsappConfig.create({
        data: {
          id: "default",
          groupId: "group-crm-main",
          webhookToken: "wh_token_achariya_crm",
          enabled: true,
        },
      });
    }

    if (!config.enabled) {
      return NextResponse.json({ message: "WhatsApp integration disabled in config" }, { status: 200 });
    }

    // 3. Match sender with team members in DB
    const cleanPhone = senderPhone.replace(/[^0-9]/g, "");
    const users = await prisma.user.findMany();

    let matchedUser = users.find((u) => {
      if (!u.phone) return false;
      const uClean = u.phone.replace(/[^0-9]/g, "");
      return uClean && (uClean === cleanPhone || cleanPhone.endsWith(uClean) || uClean.endsWith(cleanPhone));
    });

    if (!matchedUser && senderName) {
      const lowerName = senderName.toLowerCase();
      matchedUser = users.find((u) => u.name.toLowerCase().includes(lowerName) || lowerName.includes(u.name.toLowerCase()));
    }

    // Default system user fallback if none matched
    const adminUser = users.find((u) => u.role === "admin") || users[0];
    const actingUser = matchedUser || adminUser;

    // 4. Parse Command
    const textLower = rawMessage.toLowerCase();
    const isNewTask = textLower.includes("#newtask") || textLower.startsWith("new task") || textLower.includes("create task");

    let actionTaken = "UNKNOWN";
    let affectedTaskId: string | null = null;
    let affectedUserId: string | null = actingUser?.id || null;

    if (isNewTask) {
      // --- CREATE NEW TASK ---
      let title = rawMessage
        .replace(/#newtask/i, "")
        .replace(/new task:?/i, "")
        .replace(/create task:?/i, "")
        .trim();

      let assigneeId = actingUser?.id;
      let priority = "medium";
      let projectId = config.defaultProjectId;

      // Extract priority if specified
      if (textLower.includes("priority:high") || textLower.includes("urgent")) priority = "high";
      else if (textLower.includes("priority:low")) priority = "low";

      // Extract assignee if mentioned (@name or assign:name/phone)
      const assignMatch = rawMessage.match(/(?:assign:|@)([a-zA-Z0-9_\.\+-@]+)/i);
      if (assignMatch) {
        const query = assignMatch[1].toLowerCase();
        const found = users.find((u) => u.email.toLowerCase().includes(query) || u.name.toLowerCase().includes(query) || (u.phone && u.phone.includes(query)));
        if (found) assigneeId = found.id;
      }

      // Ensure valid project
      if (!projectId) {
        const firstProject = await prisma.project.findFirst();
        projectId = firstProject?.id || "";
      }

      if (projectId) {
        // Clean title
        title = title.split(/assign:|@|priority:|project:/i)[0].trim() || "Task from WhatsApp";

        const newTask = await prisma.task.create({
          data: {
            title,
            description: `Created via WhatsApp Group message from ${senderName || senderPhone || "WhatsApp User"}: "${rawMessage}"`,
            status: "todo",
            priority,
            projectId,
            assigneeId,
          },
        });

        affectedTaskId = newTask.id;
        actionTaken = "TASK_CREATED";

        if (actingUser) {
          await prisma.activity.create({
            data: {
              userId: actingUser.id,
              action: "created task via WhatsApp",
              target: newTask.title,
              targetId: newTask.id,
            },
          });
        }
      }
    } else {
      // --- UPDATE EXISTING TASK ---
      // Try to find target task ID or match title
      const allTasks = await prisma.task.findMany({ include: { project: true, assignee: true } });
      let targetTask = null;

      // Check explicit ID match (e.g. task-123, #123, or id)
      const idMatch = rawMessage.match(/(?:task-?|#|id:?\s*)([a-zA-Z0-9_-]+)/i);
      if (idMatch) {
        const potentialId = idMatch[1];
        targetTask = allTasks.find((t) => t.id === potentialId || t.id.endsWith(potentialId) || t.id.toLowerCase().includes(potentialId.toLowerCase()));
      }

      // If no ID match, try matching task title
      if (!targetTask) {
        targetTask = allTasks.find((t) => rawMessage.toLowerCase().includes(t.title.toLowerCase()));
      }

      // Fallback: pick the latest modified/created task for the matched user if status update is requested
      if (!targetTask && (textLower.includes("done") || textLower.includes("in progress") || textLower.includes("review") || textLower.includes("todo"))) {
        const userTasks = allTasks.filter((t) => t.assigneeId === actingUser?.id || t.status !== "done");
        targetTask = userTasks[0] || allTasks[0];
      }

      if (targetTask) {
        const updates: Record<string, unknown> = {};

        // Parse status update
        if (textLower.includes("done") || textLower.includes("completed") || textLower.includes("status:done")) {
          updates.status = "done";
        } else if (textLower.includes("in_progress") || textLower.includes("in progress") || textLower.includes("status:in_progress")) {
          updates.status = "in_progress";
        } else if (textLower.includes("review") || textLower.includes("status:review")) {
          updates.status = "review";
        } else if (textLower.includes("todo") || textLower.includes("status:todo")) {
          updates.status = "todo";
        }

        // Parse re-assignment
        const assignMatch = rawMessage.match(/(?:assign:|assigned to\s+|@)([a-zA-Z0-9_\.\+-@\s]+)/i);
        if (assignMatch) {
          const query = assignMatch[1].trim().toLowerCase();
          const found = users.find((u) => u.email.toLowerCase().includes(query) || u.name.toLowerCase().includes(query) || (u.phone && u.phone.includes(query)));
          if (found) {
            updates.assigneeId = found.id;
            affectedUserId = found.id;
          }
        }

        // Parse proof note if present
        const proofMatch = rawMessage.match(/proof:\s*(.+)/i);
        if (proofMatch) {
          updates.proofNote = proofMatch[1].trim();
        }

        if (Object.keys(updates).length > 0) {
          const updatedTask = await prisma.task.update({
            where: { id: targetTask.id },
            data: updates,
          });

          affectedTaskId = updatedTask.id;
          actionTaken = "TASK_UPDATED";

          if (actingUser) {
            const detailText = updates.status ? `set status to '${updates.status}'` : "updated properties";
            await prisma.activity.create({
              data: {
                userId: actingUser.id,
                action: `WhatsApp: ${detailText} on task`,
                target: updatedTask.title,
                targetId: updatedTask.id,
              },
            });
          }
        }
      }
    }

    // 5. Save Audit Log
    const log = await prisma.whatsappMessageLog.create({
      data: {
        senderPhone: senderPhone || "Unknown",
        senderName: senderName || actingUser?.name || "WhatsApp User",
        groupId: groupId || "group-crm-main",
        rawMessage,
        parsedAction: actionTaken,
        status: actionTaken !== "UNKNOWN" ? "PROCESSED" : "UNPROCESSED_COMMAND",
        taskId: affectedTaskId,
        userId: affectedUserId,
      },
    });

    return NextResponse.json({
      success: true,
      actionTaken,
      taskId: affectedTaskId,
      matchedUser: actingUser ? { id: actingUser.id, name: actingUser.name, email: actingUser.email } : null,
      logId: log.id,
    });
  } catch (err) {
    console.error("WhatsApp POST webhook error:", err);
    return NextResponse.json({ error: "Internal server error processing webhook" }, { status: 500 });
  }
}
