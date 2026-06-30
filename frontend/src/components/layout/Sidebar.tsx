"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import {
  Clock, Calendar, UserPlus, ScanLine,
  Users, Building2, BarChart3, LogOut, X
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

export function Sidebar({ locale, onClose }: { locale: string; onClose?: () => void }) {
  const t = useTranslations("nav");
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const base = `/${locale}`;

  const items: NavItem[] = [
    { href: `${base}/employee/pending`, label: t("pending"), icon: <Clock size={18} />, roles: ["employee", "admin"] },
    { href: `${base}/employee/today`, label: t("today"), icon: <Calendar size={18} />, roles: ["employee", "admin"] },
    { href: `${base}/employee/invite`, label: t("invite"), icon: <UserPlus size={18} />, roles: ["employee", "admin"] },
    { href: `${base}/guard/scan`, label: t("scan"), icon: <ScanLine size={18} />, roles: ["guard", "admin"] },
    { href: `${base}/admin/users`, label: t("users"), icon: <Users size={18} />, roles: ["admin"] },
    { href: `${base}/admin/departments`, label: t("departments"), icon: <Building2 size={18} />, roles: ["admin"] },
    { href: `${base}/reports`, label: t("reports"), icon: <BarChart3 size={18} />, roles: ["admin", "employee"] },
  ];

  const visible = items.filter((i) => !i.roles || i.roles.includes(user.role));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sidebar">
      <div className="px-5 py-6 border-b border-white/15 flex items-center justify-between">
        <Image src="/logo/logo.svg" alt="НПК Казахстан" width={110} height={44} priority />
        {onClose && (
          <button
            className="lg:hidden text-white/60 hover:text-white p-1 rounded ml-2"
            onClick={onClose}
            aria-label="Закрыть меню"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <div className="mt-2 mb-1 px-3 text-xs font-semibold text-white/40 uppercase tracking-widest">
          {user.role === "guard" ? "Охрана" : user.role === "employee" ? "Кабинет" : "Система"}
        </div>
        <nav>
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href) ? "active" : ""}`}
              onClick={onClose}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-white/15">
        <div className="px-3 py-2 text-sm text-white/70">
          <div className="font-medium text-white truncate">{user.full_name}</div>
          <div className="text-xs mt-0.5 truncate">{user.email}</div>
        </div>
        <button
          onClick={logout}
          className="sidebar-nav-item w-full text-left mt-1"
        >
          <LogOut size={18} />
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  );
}
