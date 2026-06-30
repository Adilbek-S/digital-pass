"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import Image from "next/image";

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
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300",
          "lg:static lg:translate-x-0 lg:flex-shrink-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar locale={locale} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-white/15"
          style={{ background: "var(--brand-primary)" }}
        >
          <button
            className="text-white/80 hover:text-white p-1 rounded"
            onClick={() => setMobileOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu size={22} />
          </button>
          <Image src="/logo/logo.svg" alt="НПК Казахстан" width={90} height={36} />
        </header>

        <main className="flex-1 overflow-auto bg-bg-pale">
          <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
