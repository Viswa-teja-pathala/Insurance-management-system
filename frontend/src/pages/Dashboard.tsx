import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";

interface Stats {
  policies: { total: number; active: number; pending: number; cancelled: number; expired: number; totalPremium: number };
  claims: { total: number; submitted: number; approved: number; rejected: number; underReview: number; totalApprovedAmount: number };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!stats) return null;

  const cards = [
    { label: "Total Policies", value: stats.policies.total, color: "text-gray-900" },
    { label: "Active Policies", value: stats.policies.active, color: "text-green-600" },
    { label: "Total Premium", value: `$${stats.policies.totalPremium.toFixed(2)}`, color: "text-gray-900" },
    { label: "Total Claims", value: stats.claims.total, color: "text-gray-900" },
    { label: "Approved Claims", value: stats.claims.approved, color: "text-green-600" },
    { label: "Approved Amount", value: `$${stats.claims.totalApprovedAmount.toFixed(2)}`, color: "text-gray-900" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <p className="text-gray-500 text-sm">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}