"use client";
import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { guardApi } from "@/lib/api";
import { format } from "date-fns";
import { ScanLine, Search, X, LogIn, LogOut, Phone } from "lucide-react";

interface ScanResult {
  visit_id: number;
  visitor_name: string;
  visitor_phone: string | null;
  visitor_org: string | null;
  visit_date: string;
  visit_time: string | null;
  purpose: string | null;
  status: string;
  host_employee_name: string | null;
  host_phone: string | null;
  department_name: string | null;
  colour: string;
  message: string;
  already_entered: boolean;
  entered_at: string | null;
  exited_at: string | null;
}

const COLOUR_STYLES: Record<string, { bg: string; border: string; text: string; header: string }> = {
  green:  { bg: "#f0faf0", border: "#4caf50", text: "#1b5e20", header: "#2e7d32" },
  yellow: { bg: "#fffde7", border: "#f9a825", text: "#6d5300", header: "#856404" },
  red:    { bg: "#fff0f0", border: "#e53935", text: "#7b1a1a", header: "#b71c1c" },
};

export default function ScanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("guard");
  const [manualId, setManualId] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);

  const applyResult = (r: ScanResult) => { setResult(r); setError(""); };

  const doScan = async (token: string) => {
    setError(""); setScanning(true);
    try { applyResult((await guardApi.scan(token)).data); }
    catch { setError("QR-код не распознан"); }
    finally { setScanning(false); }
  };

  const doManualSearch = async () => {
    const val = manualId.trim();
    if (!val) return;
    setError(""); setScanning(true);
    try {
      const res = /^\d+$/.test(val)
        ? await guardApi.lookup(Number(val))
        : await guardApi.scan(val);
      applyResult(res.data);
    } catch { setError("Заявка не найдена"); }
    finally { setScanning(false); }
  };

  const doCheckin = async () => {
    if (!result) return;
    setActionLoading(true);
    try { applyResult((await guardApi.checkin(result.visit_id)).data); }
    catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Ошибка регистрации входа");
    }
    finally { setActionLoading(false); }
  };

  const doCheckout = async () => {
    if (!result) return;
    setActionLoading(true);
    try { applyResult((await guardApi.checkout(result.visit_id)).data); }
    catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Ошибка регистрации выхода");
    }
    finally { setActionLoading(false); }
  };

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/library");
      const reader = new BrowserMultiFormatReader();
      if (videoRef.current) {
        reader.decodeFromVideoDevice(null, videoRef.current, async (res) => {
          if (res) { reader.reset(); setCameraActive(false); await doScan(res.getText()); }
        });
        scannerRef.current = { stop: () => reader.reset() };
      }
    } catch { setError("Камера недоступна"); setCameraActive(false); }
  };

  const stopCamera = () => { scannerRef.current?.stop(); setCameraActive(false); };
  useEffect(() => () => { scannerRef.current?.stop(); }, []);

  const colour = result?.colour ?? "red";
  const cs = COLOUR_STYLES[colour] ?? COLOUR_STYLES.red;

  return (
    <StaffLayout locale={locale} allowedRoles={["guard", "admin"]}>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera scan */}
        <div className="card p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <ScanLine size={20} style={{color:"var(--brand-primary)"}} />
            {t("scanTitle")}
          </h2>
          {cameraActive ? (
            <div>
              <video ref={videoRef} className="w-full rounded-lg" style={{maxHeight:260,objectFit:"cover"}} />
              <button className="btn-secondary mt-3 w-full flex items-center justify-center gap-2" onClick={stopCamera}>
                <X size={16} /> Остановить
              </button>
            </div>
          ) : (
            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={startCamera}>
              <ScanLine size={18} /> {t("scanBtn")}
            </button>
          )}
        </div>

        {/* Manual lookup */}
        <div className="card p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Search size={20} style={{color:"var(--brand-primary)"}} />
            {t("manualTitle")}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              className="form-input flex-1"
              placeholder="ID заявки или токен"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doManualSearch()}
            />
            <button className="btn-primary px-5" onClick={doManualSearch} disabled={!manualId.trim() || scanning}>
              {t("lookupBtn")}
            </button>
          </div>
          {error && <p className="form-error mt-2">{error}</p>}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-6 rounded-2xl border-2 overflow-hidden animate-fade-in" style={{borderColor: cs.border}}>
          {/* Header bar */}
          <div className="px-6 py-4 flex items-center gap-4" style={{background: cs.header}}>
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {colour === "green" ? "✓" : colour === "yellow" ? "!" : "✗"}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg leading-tight">
                {colour === "green" ? "Доступ разрешён" : colour === "yellow" ? "Предупреждение" : "Доступ запрещён"}
              </p>
              <p className="text-white/80 text-sm mt-0.5">{result.message}</p>
            </div>
            <button className="text-white/70 hover:text-white" onClick={() => setResult(null)}>
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6" style={{background: cs.bg}}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Visitor info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color: cs.header}}>Посетитель</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-text-muted w-32 flex-shrink-0">ФИО</dt>
                    <dd className="font-semibold text-text-primary">{result.visitor_name}</dd>
                  </div>
                  {result.visitor_phone && (
                    <div className="flex gap-2">
                      <dt className="text-text-muted w-32 flex-shrink-0">Телефон</dt>
                      <dd className="font-medium">{result.visitor_phone}</dd>
                    </div>
                  )}
                  {result.visitor_org && (
                    <div className="flex gap-2">
                      <dt className="text-text-muted w-32 flex-shrink-0">Организация</dt>
                      <dd className="font-medium">{result.visitor_org}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="text-text-muted w-32 flex-shrink-0">Дата визита</dt>
                    <dd className="font-medium">
                      {format(new Date(result.visit_date), "dd.MM.yyyy")}
                      {result.visit_time ? ` в ${result.visit_time.slice(0,5)}` : ""}
                    </dd>
                  </div>
                  {result.purpose && (
                    <div className="flex gap-2">
                      <dt className="text-text-muted w-32 flex-shrink-0">Цель</dt>
                      <dd className="text-text-secondary whitespace-pre-wrap">{result.purpose}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Host & timing */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color: cs.header}}>Принимающая сторона</p>
                <dl className="space-y-2 text-sm">
                  {result.department_name && (
                    <div className="flex gap-2">
                      <dt className="text-text-muted w-32 flex-shrink-0">Подразделение</dt>
                      <dd className="font-medium">{result.department_name}</dd>
                    </div>
                  )}
                  {result.host_employee_name && (
                    <div className="flex gap-2">
                      <dt className="text-text-muted w-32 flex-shrink-0">Сотрудник</dt>
                      <dd className="font-medium">{result.host_employee_name}</dd>
                    </div>
                  )}
                  {result.host_phone && (
                    <div className="flex gap-2 items-center">
                      <dt className="text-text-muted w-32 flex-shrink-0">Телефон</dt>
                      <dd>
                        <a
                          href={`tel:${result.host_phone.replace(/\D/g, "")}`}
                          className="font-semibold flex items-center gap-1.5 hover:underline"
                          style={{color: cs.header}}
                        >
                          <Phone size={14} /> {result.host_phone}
                        </a>
                      </dd>
                    </div>
                  )}

                  {(result.entered_at || result.exited_at) && (
                    <div className="mt-3 pt-3 border-t" style={{borderColor: cs.border}}>
                      {result.entered_at && (
                        <div className="flex gap-2">
                          <dt className="text-text-muted w-32 flex-shrink-0">Вход</dt>
                          <dd className="font-medium">{format(new Date(result.entered_at), "HH:mm, dd.MM")}</dd>
                        </div>
                      )}
                      {result.exited_at && (
                        <div className="flex gap-2 mt-1">
                          <dt className="text-text-muted w-32 flex-shrink-0">Выход</dt>
                          <dd className="font-medium">{format(new Date(result.exited_at), "HH:mm, dd.MM")}</dd>
                        </div>
                      )}
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Action buttons */}
            {(result.status === "APPROVED" || result.status === "CHECKED_IN") && (
              <div className="mt-6 pt-5 border-t flex gap-3" style={{borderColor: cs.border}}>
                {result.status === "APPROVED" && (
                  <button
                    className="btn-primary flex items-center gap-2 px-8"
                    onClick={doCheckin}
                    disabled={actionLoading}
                    style={{background: "#2e7d32"}}
                  >
                    <LogIn size={18} />
                    {actionLoading ? "…" : "Отметить вход"}
                  </button>
                )}
                {result.status === "CHECKED_IN" && (
                  <button
                    className="btn-primary flex items-center gap-2 px-8"
                    onClick={doCheckout}
                    disabled={actionLoading}
                    style={{background: "#e65100"}}
                  >
                    <LogOut size={18} />
                    {actionLoading ? "…" : "Отметить выход"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
