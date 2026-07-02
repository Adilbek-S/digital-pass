"use client";
import { useEffect, useState, use, useRef } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { visitApi, refApi } from "@/lib/api";
import { format } from "date-fns";
import Image from "next/image";
import { ScanLine, CheckCircle2, Loader2 } from "lucide-react";

const FAKE_NAMES = [
  "Айгерим Нурланова", "Данияр Сейткали", "Мадина Касымова",
  "Арман Бекович", "Зарина Аскарова", "Тимур Жаксылыков",
  "Камила Ермекова", "Бауыржан Сатыбалды", "Алия Мухамедова",
  "Санжар Байтасов", "Асель Қожахметова", "Ербол Нұрмаханов",
];

function randomDocNumber() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  return `${l1}${l2}${Math.floor(1000000 + Math.random() * 9000000)}`;
}

interface Visit {
  id: number;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string;
  visitor_org: string | null;
  purpose: string;
  country_id: number;
  visit_date: string;
  visit_time: string | null;
  status: string;
  rejection_reason: string | null;
  changes_requested_note: string | null;
  data_consent: boolean;
  visitor_link_token: string | null;
  department_name: string | null;
  host_employee_name: string | null;
}

interface Country { id: number; name_ru: string; is_default: boolean }

const STATUS_BADGE: Record<string, string> = {
  PENDING_MODERATION: "badge badge-pending",
  PENDING_HOST: "badge badge-pending",
  CHANGES_REQUESTED: "badge badge-noshow",
  APPROVED: "badge badge-approved",
  REJECTED: "badge badge-rejected",
  CANCELLED: "badge badge-rejected",
  EXPIRED: "badge badge-expired",
  NO_SHOW: "badge badge-noshow",
  CHECKED_IN: "badge badge-checkin",
  CHECKED_OUT: "badge badge-expired",
};

type QrStyle = { bg: string; border: string; fg: string; label: string };

function qrStyle(status: string): QrStyle {
  if (["APPROVED", "CHECKED_IN"].includes(status))
    return { bg: "#f0faf0", border: "#4caf50", fg: "#2e7d32", label: "Заявка одобрена — предъявите QR охране" };
  if (["REJECTED", "CANCELLED", "EXPIRED", "NO_SHOW", "CHECKED_OUT"].includes(status))
    return { bg: "#fff0f0", border: "#e53935", fg: "#b71c1c", label: "QR недействителен" };
  return { bg: "#fffde7", border: "#f9a825", fg: "#e65100", label: "Заявка на рассмотрении — QR станет активным после одобрения" };
}

function Header({ locale, token }: { locale: string; token: string }) {
  return (
    <header className="bg-brand shadow">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Image src="/logo/logo.svg" alt="НПК" width={90} height={36} />
        <div className="flex gap-1">
          {(["ru", "kk", "en"] as const).map((l) => (
            <a key={l} href={`/${l}/visit/${token}`} className={`px-2 py-1 rounded text-xs font-medium ${l === locale ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}>
              {l.toUpperCase()}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

// ── Invite confirmation form ────────────────────────────────────────────────
function InviteConfirmForm({
  visit,
  token,
  onConfirmed,
}: {
  visit: Visit;
  token: string;
  onConfirmed: (updated: Visit) => void;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    visitor_name: visit.visitor_name,
    visitor_phone: visit.visitor_phone,
    visitor_email: visit.visitor_email,
    visitor_org: visit.visitor_org ?? "",
    country_id: String(visit.country_id),
    data_consent: false,
  });
  const [equipment, setEquipment] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ocrState, setOcrState] = useState<"idle" | "scanning" | "done">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refApi.countries().then((r) => {
      setCountries(r.data);
      if (!visit.country_id) {
        const kz = r.data.find((c: Country) => c.is_default);
        if (kz) setForm((f) => ({ ...f, country_id: String(kz.id) }));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) { setOcrState("idle"); return; }
    setOcrState("scanning");
    setTimeout(() => {
      setForm((prev) => ({ ...prev, visitor_name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)] }));
      setDocNumber(randomDocNumber());
      setPhotoIndex(Math.floor(Math.random() * 10) + 1);
      setOcrState("done");
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!form.visitor_name.trim()) e2.visitor_name = "Обязательно";
    if (!form.visitor_phone.trim()) e2.visitor_phone = "Обязательно";
    if (!form.visitor_email.trim()) e2.visitor_email = "Обязательно";
    if (!form.data_consent) e2.data_consent = "Необходимо согласие";
    setErrors(e2);
    if (Object.keys(e2).length > 0) return;

    setSubmitting(true);
    try {
      const extras = [
        docNumber.trim() ? `Документ №: ${docNumber.trim()}` : "",
        equipment.trim() ? `Техника: ${equipment.trim()}` : "",
      ].filter(Boolean).join("\n");
      const purposeWithExtras = extras ? `${visit.purpose}\n\n${extras}` : visit.purpose;

      const res = await visitApi.update(token, {
        visitor_name: form.visitor_name.trim(),
        visitor_phone: form.visitor_phone.trim(),
        visitor_email: form.visitor_email.trim(),
        visitor_org: form.visitor_org.trim() || undefined,
        country_id: Number(form.country_id),
        purpose: purposeWithExtras,
        data_consent: true,
      });
      if (file) {
        await visitApi.uploadDocument(token, file).catch(() => {});
      }
      onConfirmed(res.data);
    } catch {
      setErrors({ _global: "Ошибка при отправке данных. Попробуйте ещё раз." });
    } finally {
      setSubmitting(false);
    }
  };

  const dateStr = format(new Date(visit.visit_date), "dd.MM.yyyy");
  const timeStr = visit.visit_time ? ` в ${visit.visit_time.slice(0, 5)}` : "";

  return (
    <div className="min-h-screen bg-bg-pale">
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

        {/* Invitation banner */}
        <div className="rounded-2xl mb-6 overflow-hidden" style={{ border: "2px solid var(--brand-primary)" }}>
          <div className="px-6 py-5" style={{ background: "var(--brand-primary)" }}>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">Приглашение на посещение</p>
            <h1 className="text-white text-xl font-bold leading-snug">НПК Казахстана</h1>
          </div>
          <div className="px-6 py-5 bg-white">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {visit.host_employee_name && (
                <div>
                  <dt className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Приглашает</dt>
                  <dd className="font-semibold text-text-primary">{visit.host_employee_name}</dd>
                </div>
              )}
              {visit.department_name && (
                <div>
                  <dt className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Подразделение</dt>
                  <dd className="font-semibold text-text-primary">{visit.department_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Дата{visit.visit_time ? " и время" : ""}</dt>
                <dd className="font-semibold text-text-primary">{dateStr}{timeStr}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Цель визита</dt>
                <dd className="font-medium text-text-secondary whitespace-pre-wrap">{visit.purpose}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Form */}
        <div className="card p-8">
          <h2 className="text-lg font-bold text-text-primary mb-1">Заполните данные для пропуска</h2>
          <p className="text-text-muted text-sm mb-6">Поля предзаполнены из приглашения — проверьте и дополните недостающее.</p>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Document scan */}
              <div className="sm:col-span-2">
                <label className="form-label">Скан документа (паспорт / удостоверение)</label>
                <div
                  className="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer"
                  style={{
                    borderColor: ocrState === "done" ? "#4caf50" : ocrState === "scanning" ? "#f9a825" : "var(--border)",
                    background: ocrState === "done" ? "#f0faf0" : ocrState === "scanning" ? "#fffde7" : "var(--bg-subtle)",
                    padding: "20px 24px",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: ocrState === "done" ? "#4caf50" : ocrState === "scanning" ? "#f9a825" : "var(--brand-primary)" }}
                    >
                      {ocrState === "scanning" ? (
                        <Loader2 size={24} className="text-white animate-spin" />
                      ) : ocrState === "done" ? (
                        <CheckCircle2 size={24} className="text-white" />
                      ) : (
                        <ScanLine size={24} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {ocrState === "idle" && !file && (
                        <>
                          <p className="font-medium text-text-primary">Загрузить документ для распознавания</p>
                          <p className="text-sm text-text-muted mt-0.5">PDF, JPEG, PNG · до 10 МБ · ФИО заполнится автоматически</p>
                        </>
                      )}
                      {ocrState === "scanning" && (
                        <p className="font-medium" style={{ color: "#856404" }}>Идёт распознавание документа…</p>
                      )}
                      {ocrState === "done" && (
                        <>
                          <p className="font-medium" style={{ color: "#2e7d32" }}>Документ распознан</p>
                          <p className="text-sm mt-0.5 truncate" style={{ color: "#388e3c" }}>{file?.name}</p>
                        </>
                      )}
                      {ocrState === "idle" && file && (
                        <p className="font-medium text-text-primary">{file.name}</p>
                      )}
                    </div>
                    {file && (
                      <button
                        type="button"
                        className="text-xs text-text-muted hover:text-text-primary flex-shrink-0"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setFile(null); setOcrState("idle");
                          set("visitor_name", visit.visitor_name); setDocNumber(""); setPhotoIndex(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Фото из документа */}
              {ocrState === "done" && photoIndex !== null && (
                <div className="sm:col-span-2">
                  <label className="form-label flex items-center gap-2">
                    Фото
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "#d0fac9", color: "#2e7d32" }}>
                      Распознано из документа
                    </span>
                  </label>
                  <div className="flex items-center gap-5 px-5 py-4 rounded-xl border-2" style={{ borderColor: "#4caf50", background: "#f0faf0" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${String(photoIndex).padStart(4, "0")}.png`}
                      alt="Фото из документа"
                      className="rounded-lg object-cover border-2 border-white shadow flex-shrink-0"
                      style={{ width: 72, height: 92 }}
                    />
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#2e7d32" }}>Фотография успешно распознана</p>
                      <p className="text-xs text-text-muted mt-1">Извлечено из скана документа</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ФИО */}
              <div className="sm:col-span-2">
                <label className="form-label flex items-center gap-2">
                  ФИО *
                  {ocrState === "done" && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "#d0fac9", color: "#2e7d32" }}>
                      Распознано из документа · можно редактировать
                    </span>
                  )}
                </label>
                <input
                  className="form-input"
                  value={form.visitor_name}
                  onChange={(e) => set("visitor_name", e.target.value)}
                />
                {errors.visitor_name && <p className="form-error">{errors.visitor_name}</p>}
              </div>

              {/* Номер документа */}
              <div className="sm:col-span-2">
                <label className="form-label flex items-center gap-2">
                  Номер документа
                  {ocrState === "done" && docNumber && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "#d0fac9", color: "#2e7d32" }}>
                      Распознано · можно редактировать
                    </span>
                  )}
                </label>
                <input
                  className="form-input font-mono tracking-widest"
                  placeholder="AB1234567"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                />
              </div>

              {/* Гражданство */}
              <div>
                <label className="form-label">Гражданство</label>
                <select className="form-input" value={form.country_id} onChange={(e) => set("country_id", e.target.value)}>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name_ru}</option>)}
                </select>
              </div>

              {/* Телефон */}
              <div>
                <label className="form-label">Телефон *</label>
                <input
                  className="form-input"
                  placeholder="+7 XXX XXX XX XX"
                  value={form.visitor_phone}
                  onChange={(e) => set("visitor_phone", e.target.value)}
                />
                {errors.visitor_phone && <p className="form-error">{errors.visitor_phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.visitor_email}
                  onChange={(e) => set("visitor_email", e.target.value)}
                />
                {errors.visitor_email && <p className="form-error">{errors.visitor_email}</p>}
              </div>

              {/* Организация */}
              <div>
                <label className="form-label">Организация <span className="text-text-muted font-normal">(необязательно)</span></label>
                <input
                  className="form-input"
                  value={form.visitor_org}
                  onChange={(e) => set("visitor_org", e.target.value)}
                />
              </div>

              {/* Ввозимая техника */}
              <div className="sm:col-span-2">
                <label className="form-label">Ввозимая техника <span className="text-text-muted font-normal">(необязательно)</span></label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={"Например:\nНоутбук Dell XPS 15, S/N: ABC123456\nФотокамера Canon EOS R5, S/N: 987654"}
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                />
                <p className="text-xs text-text-muted mt-1">Укажите тип устройства, модель и серийный номер</p>
              </div>

              {/* Согласие */}
              <div className="sm:col-span-2 pt-2 border-t border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 flex-shrink-0"
                    checked={form.data_consent}
                    onChange={(e) => set("data_consent", e.target.checked)}
                  />
                  <span className="text-sm text-text-secondary">
                    Я даю согласие на обработку моих персональных данных в соответствии с Политикой конфиденциальности.
                  </span>
                </label>
                {errors.data_consent && <p className="form-error mt-1">{errors.data_consent}</p>}
              </div>
            </div>

            {errors._global && <p className="form-error mt-4">{errors._global}</p>}

            <div className="mt-6">
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Отправка…" : "Подтвердить и отправить заявку"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Status card ────────────────────────────────────────────────────────────
function StatusCard({ visit, token, locale }: { visit: Visit; token: string; locale: string }) {
  const t = useTranslations("visitorStatus");
  const tStatus = useTranslations("status");
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [localVisit, setLocalVisit] = useState(visit);

  const canCancel = ["PENDING_MODERATION", "PENDING_HOST", "APPROVED"].includes(localVisit.status) && localVisit.status !== "CHECKED_IN";

  const handleCancel = async () => {
    if (!confirm(t("cancelConfirm"))) return;
    setCancelling(true);
    try {
      await visitApi.cancel(token);
      setCancelled(true);
      setLocalVisit((v) => ({ ...v, status: "CANCELLED" }));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="card p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{t("title")}</h1>
          <p className="text-text-muted text-sm mt-0.5">#{localVisit.id} — {localVisit.visitor_name}</p>
        </div>
        <span className={STATUS_BADGE[localVisit.status] || "badge badge-pending"}>
          {tStatus(localVisit.status as never)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <dt className="text-text-muted">Дата</dt>
          <dd className="font-medium text-text-primary mt-0.5">
            {format(new Date(localVisit.visit_date), "dd.MM.yyyy")}
            {localVisit.visit_time ? ` в ${localVisit.visit_time.slice(0, 5)}` : ""}
          </dd>
        </div>
        {localVisit.department_name && (
          <div>
            <dt className="text-text-muted">Подразделение</dt>
            <dd className="font-medium text-text-primary mt-0.5">{localVisit.department_name}</dd>
          </div>
        )}
        {localVisit.host_employee_name && (
          <div>
            <dt className="text-text-muted">Принимающий</dt>
            <dd className="font-medium text-text-primary mt-0.5">{localVisit.host_employee_name}</dd>
          </div>
        )}
      </dl>

      {localVisit.rejection_reason && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "#ffe4e4" }}>
          <p className="text-sm font-medium" style={{ color: "#c0392b" }}>Причина отклонения</p>
          <p className="text-sm mt-1" style={{ color: "#7b2d2d" }}>{localVisit.rejection_reason}</p>
        </div>
      )}

      {localVisit.changes_requested_note && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "#fff3cd" }}>
          <p className="text-sm font-medium" style={{ color: "#856404" }}>Запрошены изменения</p>
          <p className="text-sm mt-1" style={{ color: "#6d5300" }}>{localVisit.changes_requested_note}</p>
        </div>
      )}

      {localVisit.visitor_link_token && (
        <div
          className="mt-6 p-6 rounded-xl text-center"
          style={{ background: qrStyle(localVisit.status).bg, border: `2px solid ${qrStyle(localVisit.status).border}` }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: qrStyle(localVisit.status).fg }}>
            {qrStyle(localVisit.status).label}
          </p>
          <div className="inline-block bg-white p-4 rounded-lg shadow-sm mt-4">
            <QRCode
              value={localVisit.visitor_link_token}
              size={200}
              fgColor={qrStyle(localVisit.status).fg}
            />
          </div>
          <p className="text-xs mt-3" style={{ color: qrStyle(localVisit.status).fg, opacity: 0.7 }}>
            {t("qrHint")}
          </p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-border flex items-center gap-3">
        <a href={`/${locale}`} className="btn-secondary">
          На главную
        </a>
        {canCancel && !cancelled && (
          <button className="btn-danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "…" : t("cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function VisitorStatusPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = use(params);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    visitApi.status(token).then((r) => setVisit(r.data)).finally(() => setLoading(false));
  }, [token]);

  const isInvitePending = visit?.status === "PENDING_HOST" && !visit?.data_consent;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-pale flex items-center justify-center">
        <p className="text-text-muted">Загрузка…</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-bg-pale flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <p className="text-text-muted">Заявка не найдена.</p>
        </div>
      </div>
    );
  }

  if (isInvitePending) {
    return (
      <>
        <Header locale={locale} token={token} />
        <InviteConfirmForm
          visit={visit}
          token={token}
          onConfirmed={(updated) => setVisit(updated)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg-pale">
      <Header locale={locale} token={token} />
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <StatusCard visit={visit} token={token} locale={locale} />
      </div>
    </div>
  );
}
