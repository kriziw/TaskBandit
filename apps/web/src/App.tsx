import { DashboardCard } from "./components/DashboardCard";
import { AppLanguage, useI18n } from "./i18n/I18nProvider";

export function App() {
  const { language, setLanguage, t } = useI18n();

  const featuredMetrics = [
    { label: t("metric.approvals_waiting"), value: "3" },
    { label: t("metric.active_chores"), value: "12" },
    { label: t("metric.streak_leader"), value: "Luca" }
  ];

  const roadmap = [
    t("roadmap.bootstrap"),
    t("roadmap.templates"),
    t("roadmap.approvals"),
    t("roadmap.leaderboard")
  ];

  const languageOptions: Array<{ code: AppLanguage; label: string }> = [
    { code: "en", label: t("language.english") },
    { code: "de", label: t("language.german") },
    { code: "hu", label: t("language.hungarian") }
  ];

  return (
    <main className="app-shell">
      <section className="toolbar">
        <label className="language-picker">
          <span>{t("locale.label")}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)}>
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1>{t("hero.title")}</h1>
          <p className="lede">{t("hero.lede")}</p>
        </div>
        <div className="mascot-card" aria-label="TaskBandit mascot placeholder">
          <div className="mascot-face">
            <span className="ear left" />
            <span className="ear right" />
            <span className="eye left" />
            <span className="eye right" />
            <span className="mask" />
            <span className="nose" />
          </div>
          <p>{t("hero.mascot")}</p>
        </div>
      </section>

      <section className="metrics">
        {featuredMetrics.map((metric) => (
          <DashboardCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>{t("panel.v1_focus")}</h2>
          <ul>
            {roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2>{t("panel.assignment_logic")}</h2>
          <ul>
            <li>{t("assignment.round_robin")}</li>
            <li>{t("assignment.least_completed_recently")}</li>
            <li>{t("assignment.highest_streak")}</li>
            <li>{t("assignment.manual_default")}</li>
          </ul>
        </article>
        <article className="panel">
          <h2>{t("panel.approval_flow")}</h2>
          <p>
            {t("approval.description")} <strong>{t("approval.needs_fixes")}</strong>,{" "}
            {t("approval.description_suffix")}
          </p>
        </article>
      </section>
    </main>
  );
}
