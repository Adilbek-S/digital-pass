"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { reportsApi } from "@/lib/api";
import { format } from "date-fns";
import { BarChart3, Users, Clock, XCircle, UserX, History } from "lucide-react";

type Tab = "byDate" | "inside" | "history" | "avgApproval" | "rejected" | "noShows";

export default function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("reports");
  const tStatus = useTranslations("status");
  const [tab, setTab] = useState<Tab>("byDate");
  const [data, setData] = useState<unknown[]>([]);
  const [metric, setMetric] = useState<{ avg_minutes: number | null; count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async (activeTab = tab) => {
    setLoading(true);
    setData([]);
    setMetric(null);
    try {
      let res;
      if (activeTab === "byDate") res = await reportsApi.byDate(dateFilter);
      else if (activeTab === "inside") res = await reportsApi.inside();
      else if (activeTab === "history") res = await reportsApi.history(fromDate || undefined, toDate || undefined);
      else if (activeTab === "avgApproval") { res = await reportsApi.avgApproval(); setMetric(res.data); return; }
      else if (activeTab === "rejected") res = await reportsApi.rejected();
      else res = await reportsApi.noShows();
      setData(res.data);
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const switchTab = (t: Tab) => { setTab(t); load(t); };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "byDate", label: t("byDate"), icon: <BarChart3 size={16} /> },
    { id: "inside", label: t("inside"), icon: <Users size={16} /> },
    { id: "history", label: t("history"), icon: <History size={16} /> },
    { id: "avgApproval", label: t("avgApproval"), icon: <Clock size={16} /> },
    { id: "rejected", label: t("rejected"), icon: <XCircle size={16} /> },
    { id: "noShows", label: t("noShows"), icon: <UserX size={16} /> },
  ];

  return (
    <StaffLayout locale={locale} allowedRoles={["admin", "employee"]}>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t("title")}</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => switchTab(tb.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === tb.id ? "bg-brand text-white" : "bg-white text-text-secondary border border-border hover:bg-bg-subtle"
            }`}
            style={tab === tb.id ? { backgroundColor: "var(--brand-primary)" } : {}}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === "byDate" && (
        <div className="flex gap-3 mb-5">
          <input type="date" className="form-input w-48" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <button className="btn-primary px-6" onClick={() => load("byDate")}>Показать</button>
        </div>
      )}
      {tab === "history" && (
        <div className="flex gap-3 flex-wrap mb-5">
          <div><label className="form-label text-xs">С</label><input type="date" className="form-input w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="form-label text-xs">По</label><input type="date" className="form-input w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          <div className="flex items-end"><button className="btn-primary px-6" onClick={() => load("history")}>Показать</button></div>
        </div>
      )}

      {/* Content */}
      {loading ? <p className="text-text-muted">Загрузка…</p> : (

        <>
          {/* Avg approval metric */}
          {tab === "avgApproval" && metric && (
            <div className="card p-8 max-w-sm">
              <p className="text-text-muted text-sm">{t("avgApproval")}</p>
              <p className="text-4xl font-bold mt-2" style={{color:"var(--brand-primary)"}}>
                {metric.avg_minutes !== null ? `${metric.avg_minutes} ${t("minutes")}` : "—"}
              </p>
              <p className="text-text-muted text-sm mt-2">Всего одобрено: {metric.count}</p>
            </div>
          )}

          {/* Tables */}
          {tab !== "avgApproval" && (
            data.length === 0 ? (
              <div className="card p-10 text-center text-text-muted">Нет данных</div>
            ) : (
              <div className="card overflow-hidden">
                <table className="data-table">
                  {tab === "byDate" && (
                    <>
                      <thead><tr><th>#</th><th>Посетитель</th><th>Организация</th><th>Подразделение</th><th>Принимающий</th><th>Статус</th></tr></thead>
                      <tbody>
                        {(data as Record<string, unknown>[]).map((row) => (
                          <tr key={row.id as number}>
                            <td className="text-text-muted">{row.id as number}</td>
                            <td className="font-medium">{row.visitor_name as string}</td>
                            <td>{(row.visitor_org as string) || "—"}</td>
                            <td>{(row.department_name as string) || "—"}</td>
                            <td>{(row.host_employee_name as string) || "—"}</td>
                            <td><span className="badge badge-pending">{tStatus((row.status as never))}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {tab === "inside" && (
                    <>
                      <thead><tr><th>#</th><th>Посетитель</th><th>Организация</th><th>Подразделение</th><th>Вход</th></tr></thead>
                      <tbody>
                        {(data as Record<string, unknown>[]).map((row) => (
                          <tr key={row.id as number}>
                            <td className="text-text-muted">{row.id as number}</td>
                            <td className="font-medium">{row.visitor_name as string}</td>
                            <td>{(row.visitor_org as string) || "—"}</td>
                            <td>{(row.department_name as string) || "—"}</td>
                            <td>{row.entered_at ? format(new Date(row.entered_at as string), "HH:mm") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {tab === "history" && (
                    <>
                      <thead><tr><th>#</th><th>Посетитель</th><th>Дата</th><th>Статус</th><th>Вход</th><th>Выход</th></tr></thead>
                      <tbody>
                        {(data as Record<string, unknown>[]).map((row) => (
                          <tr key={row.id as number}>
                            <td className="text-text-muted">{row.id as number}</td>
                            <td className="font-medium">{row.visitor_name as string}</td>
                            <td>{format(new Date(row.visit_date as string), "dd.MM.yyyy")}</td>
                            <td><span className="badge badge-pending">{tStatus((row.status as never))}</span></td>
                            <td>{row.entered_at ? format(new Date(row.entered_at as string), "HH:mm dd.MM") : "—"}</td>
                            <td>{row.exited_at ? format(new Date(row.exited_at as string), "HH:mm dd.MM") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {tab === "rejected" && (
                    <>
                      <thead><tr><th>#</th><th>Посетитель</th><th>Дата</th><th>Подразделение</th><th>Причина</th></tr></thead>
                      <tbody>
                        {(data as Record<string, unknown>[]).map((row) => (
                          <tr key={row.id as number}>
                            <td className="text-text-muted">{row.id as number}</td>
                            <td className="font-medium">{row.visitor_name as string}</td>
                            <td>{format(new Date(row.visit_date as string), "dd.MM.yyyy")}</td>
                            <td>{(row.department_name as string) || "—"}</td>
                            <td className="text-text-muted max-w-xs truncate">{(row.rejection_reason as string) || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {tab === "noShows" && (
                    <>
                      <thead><tr><th>#</th><th>Посетитель</th><th>Дата</th><th>Подразделение</th></tr></thead>
                      <tbody>
                        {(data as Record<string, unknown>[]).map((row) => (
                          <tr key={row.id as number}>
                            <td className="text-text-muted">{row.id as number}</td>
                            <td className="font-medium">{row.visitor_name as string}</td>
                            <td>{format(new Date(row.visit_date as string), "dd.MM.yyyy")}</td>
                            <td>{(row.department_name as string) || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            )
          )}
        </>
      )}
    </StaffLayout>
  );
}
