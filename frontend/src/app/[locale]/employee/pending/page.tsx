"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { visitApi } from "@/lib/api";
import { format } from "date-fns";

interface Visit {
  id: number;
  visitor_name: string;
  visitor_email: string;
  visitor_org: string | null;
  visit_date: string;
  purpose: string;
  department_name: string | null;
  status: string;
  visitor_link_token: string;
}

export default function PendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("employee");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [changesId, setChangesId] = useState<number | null>(null);
  const [changesNote, setChangesNote] = useState("");

  const load = () => {
    setLoading(true);
    visitApi.myPending().then((r) => setVisits(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    setActionId(id);
    try { await visitApi.approve(id); load(); } finally { setActionId(null); }
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionId(rejectId);
    try { await visitApi.reject(rejectId, rejectReason); setRejectId(null); setRejectReason(""); load(); } finally { setActionId(null); }
  };

  const requestChanges = async () => {
    if (!changesId || !changesNote.trim()) return;
    setActionId(changesId);
    try { await visitApi.requestChanges(changesId, changesNote); setChangesId(null); setChangesNote(""); load(); } finally { setActionId(null); }
  };

  return (
    <StaffLayout locale={locale} allowedRoles={["employee", "admin"]}>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t("pendingTitle")}</h1>

      {loading ? (
        <p className="text-text-muted">Загрузка…</p>
      ) : visits.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">Нет ожидающих заявок</div>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => (
            <div key={v.id} className="card p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="font-semibold text-text-primary">{v.visitor_name}</p>
                  <p className="text-sm text-text-muted">{v.visitor_email}{v.visitor_org ? ` · ${v.visitor_org}` : ""}</p>
                  <p className="text-sm text-text-muted mt-1">
                    {format(new Date(v.visit_date), "dd.MM.yyyy")} · {v.department_name}
                  </p>
                  <p className="text-sm text-text-secondary mt-2 max-w-lg">{v.purpose}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary text-sm px-4 py-2" onClick={() => approve(v.id)} disabled={actionId === v.id}>
                    {t("approve")}
                  </button>
                  <button className="btn-danger text-sm px-4 py-2" onClick={() => { setRejectId(v.id); setRejectReason(""); }}>
                    {t("reject")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h3 className="font-semibold mb-4">{t("rejectReason")}</h3>
            <textarea className="form-input" rows={3} placeholder={t("rejectReasonPlaceholder")} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-3 mt-4">
              <button className="btn-danger flex-1" onClick={reject} disabled={!rejectReason.trim() || !!actionId}>Отклонить</button>
              <button className="btn-secondary flex-1" onClick={() => setRejectId(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Changes modal */}
      {changesId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h3 className="font-semibold mb-4">{t("changesNote")}</h3>
            <textarea className="form-input" rows={3} value={changesNote} onChange={(e) => setChangesNote(e.target.value)} />
            <div className="flex gap-3 mt-4">
              <button className="btn-primary flex-1" onClick={requestChanges} disabled={!changesNote.trim() || !!actionId}>Отправить</button>
              <button className="btn-secondary flex-1" onClick={() => setChangesId(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
