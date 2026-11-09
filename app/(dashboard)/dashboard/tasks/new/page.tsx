"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { NewTaskForm } from "@/components/tasks/new-task-form";

function NewTaskPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;
  const milestoneId = searchParams.get("milestoneId") || undefined;
  const assigneeId = searchParams.get("assignee") || undefined;

  const handleBack = () => {
    if (projectId) {
      router.push(`/dashboard/projects/${projectId}`);
    } else {
      router.push("/dashboard/tasks");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 pb-10 space-y-6">
      {/* HERO HEADER BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A3A5C] via-[#1f3e68] to-[#2b2a5a] p-6 sm:p-7 text-white shadow-xl shadow-slate-900/10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-pink-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/3 -bottom-20 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-500 text-white shadow-lg shadow-pink-500/25 ring-1 ring-white/25 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                New task
              </h1>
              <p className="text-xs sm:text-sm text-white/70 mt-0.5">
                Assign creative deliverables with automatic workload &amp; SLA
                escalation tracking.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tasks</span>
          </button>
        </div>
      </motion.div>

      <NewTaskForm
        defaultProjectId={projectId}
        defaultMilestoneId={milestoneId}
        defaultAssigneeId={assigneeId}
        onSuccess={handleBack}
        onCancel={handleBack}
      />
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-8 text-sm text-slate-400">
          Loading task form...
        </div>
      }
    >
      <NewTaskPageContent />
    </Suspense>
  );
}
