import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import Pagination from "../components/Pagination";
import EditPolicyModal from "../components/EditPolicyModal";

interface Policy {
  id: string; policyNumber: string; type: string; premium: number;
  coverage: number; status: string; customerId: string; agentId: string | null;
  startDate: string; endDate: string;
}

interface Agent {
  id: string; name: string; email: string;
}

interface Customer {
  id: string; name: string; email: string;
}

export default function Policies() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState({
    policyNumber: "", type: "", premium: "", coverage: "",
    startDate: "", endDate: "", customerId: "",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const canManage = user?.role === "ADMIN" || user?.role === "AGENT";
  const isAdmin = user?.role === "ADMIN";

  const loadPolicies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/policies", {
        params: {
          page,
          limit: 10,
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
        },
      });
      setPolicies(res.data.policies);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [page, statusFilter]);

  // Debounce search input so we don't fire a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadPolicies();
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (isAdmin) {
      api.get("/users", { params: { role: "AGENT" } }).then((res) => setAgents(res.data));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (canManage) {
      api.get("/users", { params: { role: "CUSTOMER" } }).then((res) => setCustomers(res.data));
    }
  }, [canManage]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/policies", {
        ...form,
        premium: Number(form.premium),
        coverage: Number(form.coverage),
      });
      setShowForm(false);
      setForm({ policyNumber: "", type: "", premium: "", coverage: "", startDate: "", endDate: "", customerId: "" });
      loadPolicies();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/policies/${id}/status`, { status });
      loadPolicies();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const assignAgent = async (id: string, agentId: string) => {
    try {
      await api.patch(`/policies/${id}/assign-agent`, { agentId: agentId || null });
      loadPolicies();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string, policyNumber: string) => {
    if (!confirm(`Delete policy ${policyNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/policies/${id}`);
      loadPolicies();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const exportCSV = () => {
    const headers = ["Policy Number", "Type", "Premium", "Coverage", "Status"];
    const rows = policies.map((p) => [p.policyNumber, p.type, p.premium, p.coverage, p.status]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "policies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Policies</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="border px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Export CSV
          </button>
          {canManage && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? "Cancel" : "New Policy"}
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6">
          {formError && <ErrorBanner message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Policy Number" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="border rounded-lg px-3 py-2" required />
            <input placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded-lg px-3 py-2" required />
            <input type="number" step="0.01" placeholder="Premium" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} className="border rounded-lg px-3 py-2" required />
            <input type="number" placeholder="Coverage" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} className="border rounded-lg px-3 py-2" required />
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border rounded-lg px-3 py-2" required />
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border rounded-lg px-3 py-2" required />
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="border rounded-lg px-3 py-2 col-span-2"
              required
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={submitting} className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            {submitting ? "Creating..." : "Create Policy"}
          </button>
        </form>
      )}

      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search by policy number or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : policies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No policies found.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-500 border-b">
                <tr>
                  <th className="p-3 font-medium">Policy #</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Premium</th>
                  <th className="p-3 font-medium">Status</th>
                  {isAdmin && <th className="p-3 font-medium">Agent</th>}
                  {canManage && <th className="p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 font-medium">{p.policyNumber}</td>
                    <td className="p-3">{p.type}</td>
                    <td className="p-3">${p.premium.toFixed(2)}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    {isAdmin && (
                      <td className="p-3">
                        <select
                          value={p.agentId || ""}
                          onChange={(e) => assignAgent(p.id, e.target.value)}
                          className="border rounded-lg px-2 py-1 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {canManage && (
                      <td className="p-3 flex gap-2 items-center">
                        <select
                          value={p.status}
                          onChange={(e) => updateStatus(p.id, e.target.value)}
                          className="border rounded-lg px-2 py-1 text-sm"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="EXPIRED">EXPIRED</option>
                        </select>
                        <button
                          onClick={() => setEditingPolicy(p)}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(p.id, p.policyNumber)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {editingPolicy && (
        <EditPolicyModal
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSaved={loadPolicies}
        />
      )}
    </div>
  );
}