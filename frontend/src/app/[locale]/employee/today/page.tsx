"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { visitApi } from "@/lib/api";

interface Visit {
  id: number;
  visitor_name: string;
  visitor_org: string | null;
  visit_time: string | null;
  status: string;
  host_employee_name: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  APPROVED: "badge badge-approved",
  CHECKED_IN: "badge badge-checkin",
  CHECKED_OUT: "badge badge-expired",
};

export default function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("employee");
  const tStatus = useTranslations("status");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    visitApi.myToday().then((r) => setVisits(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const revoke = async () => {
    if (!revokeId || !revokeReason.trim()) return;
    setActionId(revokeId);
    try { await visitApi.revoke(revokeId, revokeReason); setRevokeId(null); setRevokeReason(""); load(); } finally { setActionId(null); }
  };

  return (
    <StaffLayout locale={locale} allowedRoles={["employee", "admin"]}>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t("todayTitle")}</h1>
      {loading ? <p className="text-text-muted">Загрузка…</p> : visits.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">Посетителей сегодня нет</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr>
              <th>Посетитель</th><th>Время</th><th>Статус</th><th></th>
            </tr></thead>
            <tbody>{visits.map((v) => (
              <tr key={v.id}>
                <td><div className="font-medium">{v.visitor_name}</div><div className="text-xs text-text-muted">{v.visitor_org}</div></td>
                <td>{v.visit_time ? v.visit_time.slice(0, 5) : "—"}</td>
                <td><span className={STATUS_BADGE[v.status] || "badge badge-pending"}>{tStatus(v.status as never)}</span></td>
                <td>
                  {v.status === "APPROVED" && (
                    <button className="btn-danger text-xs px-3 py-1.5" onClick={() => { setRevokeId(v.id); setRevokeReason(""); }}>
                      {t("revoke")}
                    </button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {revokeId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h3 className="font-semibold mb-4">{t("revokeReason")}</h3>
            <textarea className="form-input" rows={3} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
            <div className="flex gap-3 mt-4">
              <button className="btn-danger flex-1" onClick={revoke} disabled={!revokeReason.trim() || !!actionId}>Отозвать</button>
              <button className="btn-secondary flex-1" onClick={() => setRevokeId(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
