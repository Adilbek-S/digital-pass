"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { visitApi, refApi } from "@/lib/api";
import { ScanLine, CheckCircle2, Loader2 } from "lucide-react";

interface Dept { id: number; name: string; code: string }
interface Country { id: number; name_ru: string; name_kk: string; name_en: string; code: string; is_default: boolean }
interface Employee { id: number; full_name: string; department_id: number }

const FAKE_NAMES = [
  "Айгерим Нурланова", "Данияр Сейткали", "Мадина Касымова",
  "Арман Бекович", "Зарина Аскарова", "Тимур Жаксылыков",
  "Камила Ермекова", "Бауыржан Сатыбалды", "Алия Мухамедова",
  "Санжар Байтасов", "Асель Қожахметова", "Ербол Нұрмаханов",
];

const SERVICES = [
  "МСПД",
  "СМК (Клиринг)",
  "СМЭП",
  "СОБС",
  "Межбанковская система мобильных платежей",
  "Цифровой теңге",
  "Антифрод-центр",
  "Удаленная идентификация (ЦОИД)",
  "Система Открытого банкинга",
  "Удостоверяющий центр",
  "Межбанковская система платежных карточек",
  "ФАСТИ",
  "SWIFT сервисное бюро",
];

function randomDocNumber() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const digits = String(Math.floor(1000000 + Math.random() * 9000000));
  return `${l1}${l2}${digits}`;
}

export default function VisitorFormPage() {
  const t = useTranslations("visitForm");
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [depts, setDepts] = useState<Dept[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [ocrState, setOcrState] = useState<"idle" | "scanning" | "done">("idle");

  // IT dept routing (for service mode)
  const [itDeptId, setItDeptId] = useState<number | null>(null);
  const [itEmployeeId, setItEmployeeId] = useState<number | null>(null);

  // Selection mode: department or service
  const [selectionMode, setSelectionMode] = useState<"department" | "service">("department");
  const [selectedService, setSelectedService] = useState("");

  const [form, setForm] = useState({
    visitor_name: "",
    visitor_phone: "",
    visitor_email: "",
    visitor_org: "",
    country_id: "",
    purpose: "",
    visit_date: "",
    visit_time: "",
    department_id: "",
    host_employee_id: "",
    data_consent: false,
  });
  const [equipment, setEquipment] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const countryName = useCallback((c: Country) => {
    if (locale === "kk") return c.name_kk;
    if (locale === "en") return c.name_en;
    return c.name_ru;
  }, [locale]);

  useEffect(() => {
    Promise.all([refApi.departments(), refApi.countries()]).then(([d, c]) => {
      setDepts(d.data);
      setCountries(c.data);
      const kz = c.data.find((x: Country) => x.is_default);
      if (kz) setForm((f) => ({ ...f, country_id: String(kz.id) }));
      // Find IT dept and load its first employee for service routing
      const it = (d.data as Dept[]).find((dept) => dept.code === "IT");
      if (it) {
        setItDeptId(it.id);
        refApi.employees(it.id).then((r) => {
          if (r.data.length > 0) setItEmployeeId(r.data[0].id);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (form.department_id) {
      refApi.employees(Number(form.department_id)).then((r) => setEmployees(r.data));
    } else {
      setEmployees([]);
    }
  }, [form.department_id]);

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const switchMode = (mode: "department" | "service") => {
    setSelectionMode(mode);
    if (mode === "service") {
      setForm((f) => ({ ...f, department_id: "", host_employee_id: "" }));
    } else {
      setSelectedService("");
    }
    setErrors({});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) { setOcrState("idle"); return; }
    setOcrState("scanning");
    setTimeout(() => {
      const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
      setForm((prev) => ({ ...prev, visitor_name: name }));
      setDocNumber(randomDocNumber());
      setPhotoIndex(Math.floor(Math.random() * 10) + 1);
      setOcrState("done");
    }, 1200);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.visitor_name.trim()) e.visitor_name = "Обязательно";
    if (!form.visitor_phone.trim()) e.visitor_phone = "Обязательно";
    if (!form.visitor_email.trim()) e.visitor_email = "Обязательно";
    if (!form.purpose.trim()) e.purpose = "Обязательно";
    if (!form.visit_date) e.visit_date = "Обязательно";
    if (selectionMode === "department") {
      if (!form.department_id) e.department_id = "Обязательно";
    } else {
      if (!selectedService) e.selectedService = "Выберите проект или услугу";
    }
    if (!form.data_consent) e.data_consent = "Необходимо согласие";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const extras = [
        docNumber.trim() ? `Документ №: ${docNumber.trim()}` : "",
        equipment.trim() ? `Техника: ${equipment.trim()}` : "",
      ].filter(Boolean).join("\n");
      const basePurpose = selectionMode === "service"
        ? `Проект/услуга: ${selectedService}\n${form.purpose}`
        : form.purpose;
      const purposeFinal = extras ? `${basePurpose}\n\n${extras}` : basePurpose;

      const deptId = selectionMode === "service" ? itDeptId : Number(form.department_id);
      const empId = selectionMode === "service"
        ? itEmployeeId
        : (form.host_employee_id ? Number(form.host_employee_id) : null);

      const payload: Record<string, unknown> = {
        ...form,
        purpose: purposeFinal,
        country_id: Number(form.country_id),
        department_id: deptId,
        host_employee_id: empId,
        visit_time: form.visit_time || null,
      };
      const res = await visitApi.createPublic(payload);
      const { visitor_link_token } = res.data;
      if (file && visitor_link_token) {
        await visitApi.uploadDocument(visitor_link_token, file).catch(() => {});
      }
      router.push(`/${locale}/visit/${visitor_link_token}`);
    } catch {
      setErrors({ _global: "Ошибка при отправке заявки" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-pale">
      {/* Header */}
      <header className="bg-brand shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href={`/${locale}`}>
            <Image src="/logo/logo.svg" alt="НПК" width={100} height={40} />
          </a>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/${locale}`)} className="text-white/80 hover:text-white text-sm font-medium">
              ← На главную
            </button>
            <button onClick={() => router.push(`/${locale}/auth/login`)} className="text-white/80 hover:text-white text-sm font-medium">
              Вход для сотрудников
            </button>
            <div className="flex gap-1 ml-4">
              {(["ru", "kk", "en"] as const).map((l) => (
                <a key={l} href={`/${l}/apply`} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${l === locale ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}>
                  {l.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-brand pb-10 pt-8">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
          <p className="text-white/70">{t("subtitle")}</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-4 -mt-4 pb-12">
        <div className="card p-8 animate-fade-in">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Document scan */}
              <div className="md:col-span-2">
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
                        <>
                          <p className="font-medium" style={{ color: "#856404" }}>Идёт распознавание документа…</p>
                          <p className="text-sm mt-0.5" style={{ color: "#a07000" }}>Пожалуйста, подождите</p>
                        </>
                      )}
                      {ocrState === "done" && (
                        <>
                          <p className="font-medium" style={{ color: "#2e7d32" }}>Документ распознан</p>
                          <p className="text-sm mt-0.5 truncate" style={{ color: "#388e3c" }}>{file?.name}</p>
                        </>
                      )}
                      {ocrState === "idle" && file && (
                        <>
                          <p className="font-medium text-text-primary">{file.name}</p>
                          <p className="text-sm text-text-muted mt-0.5">Файл прикреплён</p>
                        </>
                      )}
                    </div>
                    {file && (
                      <button
                        type="button"
                        className="text-xs text-text-muted hover:text-text-primary flex-shrink-0"
                        onClick={(ev) => { ev.stopPropagation(); setFile(null); setOcrState("idle"); set("visitor_name", ""); setDocNumber(""); setPhotoIndex(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Фото из документа */}
              {ocrState === "done" && photoIndex !== null && (
                <div className="md:col-span-2">
                  <label className="form-label flex items-center gap-2">
                    Фото
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "#d0fac9", color: "#2e7d32" }}>
                      Распознано из документа
                    </span>
                  </label>
                  <div className="flex items-center gap-5 px-5 py-4 rounded-xl border-2" style={{ borderColor: "#4caf50", background: "#f0faf0" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${String(photoIndex).padStart(4, "0")}.jpg`}
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
              <div className="md:col-span-2">
                <label className="form-label flex items-center gap-2">
                  {t("fullName")} *
                  {ocrState === "done" && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "#d0fac9", color: "#2e7d32" }}>
                      Распознано из документа · можно редактировать
                    </span>
                  )}
                </label>
                <input
                  className="form-input"
                  placeholder={t("fullNamePlaceholder")}
                  value={form.visitor_name}
                  onChange={(e) => set("visitor_name", e.target.value)}
                />
                {errors.visitor_name && <p className="form-error">{errors.visitor_name}</p>}
              </div>

              {/* Номер документа */}
              <div className="md:col-span-2">
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
                <label className="form-label">{t("country")} *</label>
                <select className="form-input" value={form.country_id} onChange={(e) => set("country_id", e.target.value)}>
                  <option value="">—</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{countryName(c)}</option>
                  ))}
                </select>
              </div>

              {/* Телефон */}
              <div>
                <label className="form-label">{t("phone")} *</label>
                <input className="form-input" placeholder={t("phonePlaceholder")} value={form.visitor_phone} onChange={(e) => set("visitor_phone", e.target.value)} />
                {errors.visitor_phone && <p className="form-error">{errors.visitor_phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="form-label">{t("email")} *</label>
                <input type="email" className="form-input" placeholder={t("emailPlaceholder")} value={form.visitor_email} onChange={(e) => set("visitor_email", e.target.value)} />
                {errors.visitor_email && <p className="form-error">{errors.visitor_email}</p>}
              </div>

              {/* Организация */}
              <div>
                <label className="form-label">{t("organization")}</label>
                <input className="form-input" placeholder={t("organizationPlaceholder")} value={form.visitor_org} onChange={(e) => set("visitor_org", e.target.value)} />
              </div>

              {/* Дата */}
              <div>
                <label className="form-label">{t("visitDate")} *</label>
                <input type="date" className="form-input" value={form.visit_date} min={new Date().toISOString().split("T")[0]} onChange={(e) => set("visit_date", e.target.value)} />
                {errors.visit_date && <p className="form-error">{errors.visit_date}</p>}
              </div>

              {/* Время */}
              <div>
                <label className="form-label">{t("visitTime")}</label>
                <input type="time" className="form-input" value={form.visit_time} onChange={(e) => set("visit_time", e.target.value)} />
              </div>

              {/* ── Принимающая сторона ─────────────────────────────────── */}
              <div className="md:col-span-2">
                <p className="form-label mb-3">Принимающая сторона *</p>

                {/* Segmented control */}
                <div className="inline-flex rounded-xl border border-border bg-bg-subtle p-1 mb-4">
                  <button
                    type="button"
                    onClick={() => switchMode("department")}
                    className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                    style={selectionMode === "department"
                      ? { background: "var(--brand-primary)", color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.15)" }
                      : { color: "var(--text-muted)" }}
                  >
                    Подразделение
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("service")}
                    className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                    style={selectionMode === "service"
                      ? { background: "var(--brand-primary)", color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.15)" }
                      : { color: "var(--text-muted)" }}
                  >
                    Проект / услуга
                  </button>
                </div>

                {selectionMode === "department" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{t("department")}</label>
                      <select
                        className="form-input"
                        value={form.department_id}
                        onChange={(e) => { set("department_id", e.target.value); set("host_employee_id", ""); }}
                      >
                        <option value="">—</option>
                        {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      {errors.department_id && <p className="form-error">{errors.department_id}</p>}
                    </div>
                    <div>
                      <label className="form-label">{t("employee")}</label>
                      <select
                        className="form-input"
                        value={form.host_employee_id}
                        onChange={(e) => set("host_employee_id", e.target.value)}
                        disabled={!form.department_id}
                      >
                        <option value="">—</option>
                        {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="form-label">Проект / услуга</label>
                    <select
                      className="form-input max-w-lg"
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                    >
                      <option value="">— Выберите проект или услугу —</option>
                      {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.selectedService && <p className="form-error">{errors.selectedService}</p>}
                  </div>
                )}
              </div>

              {/* Цель */}
              <div className="md:col-span-2">
                <label className="form-label">{t("purpose")} *</label>
                <textarea className="form-input" rows={3} placeholder={t("purposePlaceholder")} value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
                {errors.purpose && <p className="form-error">{errors.purpose}</p>}
              </div>

              {/* Техника */}
              <div className="md:col-span-2">
                <label className="form-label">Ввозимая техника <span className="text-text-muted font-normal">(необязательно)</span></label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={"Например:\nНоутбук Dell XPS 15, S/N: ABC123456\nФотокамера Canon EOS R5, S/N: 987654"}
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                />
                <p className="text-xs text-text-muted mt-1">Укажите тип устройства, модель и серийный номер для каждой единицы техники</p>
              </div>

              {/* Согласие */}
              <div className="md:col-span-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-brand"
                    checked={form.data_consent}
                    onChange={(e) => set("data_consent", e.target.checked)}
                  />
                  <span className="text-sm text-text-secondary">{t("consent")}</span>
                </label>
                {errors.data_consent && <p className="form-error mt-1">{errors.data_consent}</p>}
              </div>
            </div>

            {errors._global && <p className="form-error mt-4">{errors._global}</p>}

            <div className="mt-8 flex items-center justify-end gap-3">
              <button type="button" className="btn-secondary px-8" onClick={() => router.push(`/${locale}`)}>
                На главную
              </button>
              <button type="submit" className="btn-primary px-10" disabled={submitting}>
                {submitting ? "…" : t("submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
