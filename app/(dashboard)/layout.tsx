"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-context";
import { Sidebar } from "@/components/app-shell";
import { Loader2 } from "lucide-react";
import { useCRMStore } from "@/store/crm-store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      useCRMStore.getState().load();
      const timer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          useCRMStore.getState().load();
        }
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 pt-16 lg:pt-6 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
