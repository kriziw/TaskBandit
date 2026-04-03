type DashboardCardProps = {
  label: string;
  value: string;
};

export function DashboardCard({ label, value }: DashboardCardProps) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

