"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";

export function StaffLayout({
  children,
  locale,
  allowedRoles,
}: {
  children: React.ReactNode;
  locale: string;
  allowedRoles?: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/auth/login`);
    }
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [user, loading, router, locale, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-pale">
        <div className="text-text-muted text-sm">Загрузка…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar locale={locale} />
      <main className="flex-1 overflow-auto bg-bg-pale">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
