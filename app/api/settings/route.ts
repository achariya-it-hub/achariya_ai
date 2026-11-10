import { NextResponse } from "next/server";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  getWorkspaceSettings,
  updateWorkspaceSettings,
  WorkspaceSettings,
} from "@/lib/task-sync";

export async function GET() {
  try {
    const settings = await getWorkspaceSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULT_WORKSPACE_SETTINGS);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<WorkspaceSettings> & {
      resetToDefault?: boolean;
    };
    if (body.resetToDefault) {
      const reset = await updateWorkspaceSettings(DEFAULT_WORKSPACE_SETTINGS);
      return NextResponse.json(reset);
    }
    const updated = await updateWorkspaceSettings(body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update workspace settings:", err);
    return NextResponse.json(
      { error: "Failed to update workspace settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

