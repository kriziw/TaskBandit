import { DashboardCard } from "./components/DashboardCard";

const featuredMetrics = [
  { label: "Approvals waiting", value: "3" },
  { label: "Active chores", value: "12" },
  { label: "Streak leader", value: "Luca" }
];

const roadmap = [
  "Household bootstrap and local auth",
  "Chore template builder with recurrence",
  "Approval queue for child submissions",
  "Leaderboard, streaks, and exports"
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">TaskBandit Admin</p>
          <h1>Run the household like a cheerful little mastermind.</h1>
          <p className="lede">
            The first iteration of the web experience focuses on chore
            management, approvals, visibility settings, analytics, and household
            controls.
          </p>
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
          <p>Bandit is on chore duty.</p>
        </div>
      </section>

      <section className="metrics">
        {featuredMetrics.map((metric) => (
          <DashboardCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>V1 Focus</h2>
          <ul>
            {roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2>Built-In Assignment Logic</h2>
          <ul>
            <li>Round robin</li>
            <li>Least completed recently</li>
            <li>Highest streak</li>
            <li>Manual default assignee</li>
          </ul>
        </article>
        <article className="panel">
          <h2>Approval Flow</h2>
          <p>
            Child submissions move to approval, rejected chores return to
            <strong> needs fixes</strong>, and overdue approvals still count
            toward streaks.
          </p>
        </article>
      </section>
    </main>
  );
}

