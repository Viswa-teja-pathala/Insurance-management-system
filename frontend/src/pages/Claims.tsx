import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import Pagination from "../components/Pagination";

interface Claim {
    id: string; claimNumber: string; description: string;
    amount: number; status: string; policyId: string;
}

interface PolicyOption {
    id: string; policyNumber: string; type: string;
}

export default function Claims() {
    const { user } = useAuth();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([]);
    const [form, setForm] = useState({ policyId: "", description: "", amount: "" });

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const canReview = user?.role === "ADMIN" || user?.role === "AGENT";

    const loadClaims = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/claims", {
                params: {
                    page,
                    limit: 10,
                    ...(search && { search }),
                    ...(statusFilter && { status: statusFilter }),
                },
            });
            setClaims(res.data.claims);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClaims();
    }, [page, statusFilter]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1);
            loadClaims();
        }, 400);
        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        api.get("/policies", { params: { limit: 100 } }).then((res) => setPolicyOptions(res.data.policies));
    }, []);

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSubmitting(true);
        try {
            await api.post("/claims", { ...form, amount: Number(form.amount) });
            setShowForm(false);
            setForm({ policyId: "", description: "", amount: "" });
            loadClaims();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/claims/${id}/status`, { status });
            loadClaims();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Claims</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {showForm ? "Cancel" : "File Claim"}
                </button>
            </div>

            {error && <ErrorBanner message={error} />}

            {showForm && (
                <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6">
                    {formError && <ErrorBanner message={formError} />}
                    <div className="grid grid-cols-2 gap-4">
                        <select
                            value={form.policyId}
                            onChange={(e) => setForm({ ...form, policyId: e.target.value })}
                            className="border rounded-lg px-3 py-2 col-span-2"
                            required
                        >
                            <option value="">Select a policy...</option>
                            {policyOptions.map((p) => (
                                <option key={p.id} value={p.id}>{p.policyNumber} ({p.type})</option>
                            ))}
                        </select>
                        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 col-span-2" required />
                        <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border rounded-lg px-3 py-2 col-span-2" required />
                    </div>
                    <button type="submit" disabled={submitting} className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                        {submitting ? "Submitting..." : "Submit Claim"}
                    </button>
                </form>
            )}

            <div className="flex gap-3 mb-4">
                <input
                    placeholder="Search by claim number or description..."
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
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                </select>
            </div>

            {loading ? (
                <Spinner />
            ) : claims.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                    No claims found.
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-sm text-gray-500 border-b">
                                <tr>
                                    <th className="p-3 font-medium">Claim #</th>
                                    <th className="p-3 font-medium">Description</th>
                                    <th className="p-3 font-medium">Amount</th>
                                    <th className="p-3 font-medium">Status</th>
                                    {canReview && <th className="p-3 font-medium">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {claims.map((c) => (
                                    <tr key={c.id} className="border-t hover:bg-gray-50 transition">
                                        <td className="p-3 font-medium">{c.claimNumber}</td>
                                        <td className="p-3">{c.description}</td>
                                        <td className="p-3">${c.amount.toFixed(2)}</td>
                                        <td className="p-3"><StatusBadge status={c.status} /></td>
                                        {canReview && (
                                            <td className="p-3">
                                                <select
                                                    value={c.status}
                                                    onChange={(e) => updateStatus(c.id, e.target.value)}
                                                    className="border rounded-lg px-2 py-1 text-sm"
                                                >
                                                    <option value="SUBMITTED">SUBMITTED</option>
                                                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                                                    <option value="APPROVED">APPROVED</option>
                                                    <option value="REJECTED">REJECTED</option>
                                                </select>
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
        </div>
    );
}