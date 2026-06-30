"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { adminApi } from "@/lib/api";
import { Plus } from "lucide-react";

interface Dept { id: number; name: string; code: string; is_active: boolean }

export default function DepartmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("admin");
  const [depts, setDepts] = useState<Dept[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => { adminApi.departments().then((r) => setDepts(r.data)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try { await adminApi.createDept(form.name, form.code); setShowModal(false); setForm({ name: "", code: "" }); load(); }
    finally { setSubmitting(false); }
  };

  const toggle = async (d: Dept) => {
    await adminApi.updateDept(d.id, { is_active: !d.is_active });
    load();
  };

  return (
    <StaffLayout locale={locale} allowedRoles={["admin"]}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t("deptsTitle")}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> {t("addDept")}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Название</th><th>Код</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {depts.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.name}</td>
                <td><code className="text-sm bg-bg-subtle px-2 py-0.5 rounded">{d.code}</code></td>
                <td>{d.is_active ? <span className="badge badge-approved">Активно</span> : <span className="badge badge-expired">Неактивно</span>}</td>
                <td>
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => toggle(d)}>
                    {d.is_active ? "Деактивировать" : "Активировать"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h3 className="font-semibold text-lg mb-4">{t("addDept")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">Название *</label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className="form-label">Код *</label><input className="form-input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required placeholder="IT" /></div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>Добавить</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
