"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { visitApi, refApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Copy, Check } from "lucide-react";

interface Dept { id: number; name: string }
interface Country { id: number; name_ru: string; name_kk: string; name_en: string; is_default: boolean }
interface Employee { id: number; full_name: string }

export default function InvitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("visitForm");
  const te = useTranslations("employee");
  const { user } = useAuth();

  const [depts, setDepts] = useState<Dept[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    visitor_name: "",
    visitor_phone: "",
    visitor_email: "",
    visitor_org: "",
    country_id: "",
    purpose: "",
    visit_date: "",
    visit_time: "",
    department_id: user?.department_id ? String(user.department_id) : "",
    host_employee_id: user?.user_id ? String(user.user_id) : "",
  });

  useEffect(() => {
    Promise.all([refApi.departments(), refApi.countries()]).then(([d, c]) => {
      setDepts(d.data);
      setCountries(c.data);
      const kz = c.data.find((x: Country) => x.is_default);
      if (kz) setForm((f) => ({ ...f, country_id: String(kz.id) }));
    });
  }, []);

  useEffect(() => {
    if (form.department_id) refApi.employees(Number(form.department_id)).then((r) => setEmployees(r.data));
  }, [form.department_id]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!form.visitor_name.trim()) e2.visitor_name = "Обязательно";
    if (!form.visitor_email.trim()) e2.visitor_email = "Обязательно";
    if (!form.visit_date) e2.visit_date = "Обязательно";
    if (!form.purpose.trim()) e2.purpose = "Обязательно";
    if (!form.department_id) e2.department_id = "Обязательно";
    setErrors(e2);
    if (Object.keys(e2).length > 0) return;

    setSubmitting(true);
    try {
      const res = await visitApi.createInvite({
        ...form,
        country_id: Number(form.country_id),
        department_id: Number(form.department_id),
        host_employee_id: form.host_employee_id ? Number(form.host_employee_id) : null,
        visit_time: form.visit_time || null,
      });
      const token = res.data.visitor_link_token;
      setInviteLink(`${window.location.origin}/${locale}/visit/${token}`);
      setSentEmail(form.visitor_email.trim());
    } catch {
      setErrors({ _global: "Ошибка при создании приглашения" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <StaffLayout locale={locale} allowedRoles={["employee", "admin"]}>
      <h1 className="text-2xl font-bold text-text-primary mb-2">{t("inviteTitle")}</h1>
      <p className="text-text-muted mb-6">{t("inviteSubtitle")}</p>

      {inviteLink ? (
        <div className="card p-8 max-w-lg animate-fade-in">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{background:"#d0fac9"}}>
            <Check size={24} color="#659945" />
          </div>
          <h2 className="font-semibold text-lg mb-2">Приглашение создано</h2>
          {sentEmail && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{background:"#e8f5e9", color:"#2e7d32"}}>
              Приглашение отправлено на почту <strong>{sentEmail}</strong>
            </div>
          )}
          <p className="text-text-muted text-sm mb-4">{te("inviteLink")}</p>
          <div className="flex gap-2">
            <input className="form-input flex-1 text-sm" value={inviteLink} readOnly />
            <button className="btn-secondary px-4" onClick={copyLink}>
              {copied ? <Check size={16} color="#659945" /> : <Copy size={16} />}
            </button>
          </div>
          <button className="btn-primary mt-6 w-full" onClick={() => { setInviteLink(null); setSentEmail(null); }}>
            Создать ещё одно
          </button>
        </div>
      ) : (
        <div className="card p-8 max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="form-label">{t("fullName")} *</label>
                <input className="form-input" value={form.visitor_name} onChange={(e) => set("visitor_name", e.target.value)} />
                {errors.visitor_name && <p className="form-error">{errors.visitor_name}</p>}
              </div>
              <div>
                <label className="form-label">{t("email")} *</label>
                <input type="email" className="form-input" value={form.visitor_email} onChange={(e) => set("visitor_email", e.target.value)} />
                {errors.visitor_email && <p className="form-error">{errors.visitor_email}</p>}
              </div>
              <div>
                <label className="form-label">{t("phone")} <span className="text-text-muted font-normal">(необязательно)</span></label>
                <input className="form-input" value={form.visitor_phone} onChange={(e) => set("visitor_phone", e.target.value)} />
              </div>
              <div>
                <label className="form-label">{t("organization")}</label>
                <input className="form-input" value={form.visitor_org} onChange={(e) => set("visitor_org", e.target.value)} />
              </div>
              <div>
                <label className="form-label">{t("country")}</label>
                <select className="form-input" value={form.country_id} onChange={(e) => set("country_id", e.target.value)}>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name_ru}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{t("visitDate")} *</label>
                <input type="date" className="form-input" value={form.visit_date} min={new Date().toISOString().split("T")[0]} onChange={(e) => set("visit_date", e.target.value)} />
                {errors.visit_date && <p className="form-error">{errors.visit_date}</p>}
              </div>
              <div>
                <label className="form-label">{t("visitTime")}</label>
                <input type="time" className="form-input" value={form.visit_time} onChange={(e) => set("visit_time", e.target.value)} />
              </div>
              <div>
                <label className="form-label">{t("department")} *</label>
                <select className="form-input" value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
                  <option value="">—</option>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.department_id && <p className="form-error">{errors.department_id}</p>}
              </div>
              <div>
                <label className="form-label">{t("employee")}</label>
                <select className="form-input" value={form.host_employee_id} onChange={(e) => set("host_employee_id", e.target.value)}>
                  <option value="">—</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">{t("purpose")} *</label>
                <textarea className="form-input" rows={3} value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
                {errors.purpose && <p className="form-error">{errors.purpose}</p>}
              </div>
            </div>
            {errors._global && <p className="form-error mt-3">{errors._global}</p>}
            <div className="mt-6">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "…" : "Создать приглашение"}
              </button>
            </div>
          </form>
        </div>
      )}
    </StaffLayout>
  );
}
