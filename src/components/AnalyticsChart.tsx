import { Line } from "react-chartjs-2";
import { Chart, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";
import { fetchAnalytics } from "@/lib/api";

Chart.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

interface Props {
  metric: "payments" | "listings";
  days?: number;
}

export function AnalyticsChart({ metric, days = 30 }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchAnalytics(metric, days);
        setData({
          labels: result.labels,
          datasets: [
            {
              label: metric.charAt(0).toUpperCase() + metric.slice(1),
              data: result.values,
              backgroundColor: "rgba(34, 197, 94, 0.2)",
              borderColor: "rgba(34, 197, 94, 1)",
              fill: true,
            },
          ],
        });
      } catch (e: any) {
        setError(e.message ?? "Failed to load analytics");
      }
    }
    load();
  }, [metric, days]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <div>Loading...</div>;

  return <Line data={data} />;
}
