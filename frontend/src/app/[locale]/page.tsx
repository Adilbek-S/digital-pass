"use client";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ClipboardList, ShieldCheck, QrCode } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Заполните заявку",
    desc: "Укажите ваши данные, цель визита и дату.",
  },
  {
    icon: ShieldCheck,
    title: "Заявка рассматривается",
    desc: "Принимающий сотрудник получает уведомление и согласовывает ваш визит. Обычно это занимает несколько минут.",
  },
  {
    icon: QrCode,
    title: "Покажите QR-код на входе",
    desc: "После согласования вам придёт QR-код. Предъявите его охране и проходите.",
  },
];

export default function LandingPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();

  return (
    <div className="min-h-screen bg-bg-pale flex flex-col">

      {/* Header */}
      <header className="bg-brand shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Image src="/logo/logo.svg" alt="НПК" width={100} height={40} />
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/${locale}/auth/login`)}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Вход для сотрудников
            </button>
            <div className="flex gap-1">
              {(["ru", "kk", "en"] as const).map((l) => (
                <a
                  key={l}
                  href={`/${l}`}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${l === locale ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}
                >
                  {l.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand pb-16 pt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">
            Национальный Платёжный Центр Казахстана
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Электронный пропуск
          </h1>
          <p className="text-white/75 text-lg max-w-xl mx-auto mb-8">
            Оформите заявку на посещение онлайн — без бумажных журналов и очередей.
          </p>
          <button
            onClick={() => router.push(`/${locale}/apply`)}
            className="inline-flex items-center gap-2 bg-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 text-base"
            style={{ color: "var(--brand-primary)" }}
          >
            Подать заявку на пропуск
          </button>
        </div>
      </section>

      {/* Steps */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-10">Как это работает</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-bg-pale">
                {/* Step number */}
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow"
                  style={{ background: "var(--brand-primary)" }}
                >
                  {i + 1}
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-4"
                  style={{ background: "var(--brand-light, #e8f0fe)" }}
                >
                  <step.icon size={28} style={{ color: "var(--brand-primary)" }} />
                </div>
                <h3 className="font-semibold text-text-primary text-lg mb-2">{step.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Office map */}
      <section className="py-14 bg-bg-pale">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-3">Схема проезда</h2>
          <p className="text-text-muted text-center text-sm mb-8">
            Ориентируйтесь по схеме, чтобы найти нужное подразделение
          </p>
          <div className="card p-4 md:p-6 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/office.png"
              alt="Схема офиса НПК"
              className="w-full h-auto rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-14 bg-white">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-3">Готовы к визиту?</h2>
          <p className="text-text-muted mb-6">
            Заполните заявку заранее — это займёт не более 2 минут.
          </p>
          <button
            onClick={() => router.push(`/${locale}/apply`)}
            className="btn-primary px-10 py-3 text-base"
          >
            Подать заявку
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-6 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-text-muted">
          <span>© {new Date().getFullYear()} НПК Казахстана</span>
          <span>Электронная система управления посетителями</span>
        </div>
      </footer>
    </div>
  );
}
