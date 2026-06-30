"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { adminApi, refApi } from "@/lib/api";
import { UserPlus, Pencil, UserX } from "lucide-react";

interface User { id: number; email: string; full_name: string; role: string; department_id: number | null; department_name: string | null; is_active: boolean }
interface Dept { id: number; name: string }

export default function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("admin");
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "employee", department_id: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => { adminApi.users().then((r) => setUsers(r.data)); };
  useEffect(() => { load(); refApi.departments().then((r) => setDepts(r.data)); }, []);

  const openCreate = () => { setEditUser(null); setForm({ email: "", full_name: "", password: "", role: "employee", department_id: "" }); setShowModal(true); };
  const openEdit = (u: User) => { setEditUser(u); setForm({ email: u.email, full_name: u.full_name, password: "", role: u.role, department_id: u.department_id ? String(u.department_id) : "" }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload: Record<string, unknown> = { ...form, department_id: form.department_id ? Number(form.department_id) : null };
    if (!payload.password) delete payload.password;
    try {
      if (editUser) await adminApi.updateUser(editUser.id, payload);
      else await adminApi.createUser(payload);
      setShowModal(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (id: number) => {
    if (!confirm("Деактивировать пользователя?")) return;
    await adminApi.deactivate(id);
    load();
  };

  const ROLE_LABELS: Record<string, string> = { admin: t("roles.admin"), employee: t("roles.employee"), guard: t("roles.guard") };

  return (
    <StaffLayout locale={locale} allowedRoles={["admin"]}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t("usersTitle")}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <UserPlus size={18} /> {t("addUser")}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Имя</th><th>Email</th><th>{t("role")}</th><th>Подразделение</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name}</td>
                <td className="text-text-muted">{u.email}</td>
                <td><span className="badge badge-pending">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td>{u.department_name || "—"}</td>
                <td>{u.is_active ? <span className="badge badge-approved">Активен</span> : <span className="badge badge-rejected">Неактивен</span>}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => openEdit(u)}><Pencil size={14} /></button>
                    {u.is_active && <button className="btn-danger text-xs px-3 py-1.5" onClick={() => deactivate(u.id)}><UserX size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h3 className="font-semibold text-lg mb-4">{editUser ? "Редактировать" : t("addUser")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">Имя *</label><input className="form-input" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required /></div>
              <div><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></div>
              <div><label className="form-label">Пароль {editUser ? "(оставьте пустым)" : "*"}</label><input type="password" className="form-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editUser} /></div>
              <div>
                <label className="form-label">{t("role")} *</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="employee">{t("roles.employee")}</option>
                  <option value="guard">{t("roles.guard")}</option>
                  <option value="admin">{t("roles.admin")}</option>
                </select>
              </div>
              <div>
                <label className="form-label">Подразделение</label>
                <select className="form-input" value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}>
                  <option value="">—</option>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>Сохранить</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
