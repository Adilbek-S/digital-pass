"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      const role = user.role;
      if (role === "guard") {
        router.replace(`/${locale}/guard/scan`);
      } else if (role === "admin") {
        router.replace(`/${locale}/admin/users`);
      } else {
        router.replace(`/${locale}/employee/pending`);
      }
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1f4444 0%, #295a5b 60%, #28594e 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="card p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: "#295a5b" }}
            >
              <Image src="/logo/logo.svg" alt="НПК" width={40} height={16} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t("loginTitle")}</h1>
            <p className="text-text-muted text-sm mt-1">{t("loginSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">{t("email")}</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="form-label">{t("password")}</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "…" : t("signIn")}
            </button>
          </form>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          &copy; {new Date().getFullYear()} Национальная платёжная корпорация Казахстана
        </p>
      </div>
    </div>
  );
}
