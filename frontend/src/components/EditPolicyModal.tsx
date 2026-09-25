import { useState } from "react";
import type { FormEvent } from "react";
import api, { getErrorMessage } from "../api/client";
import ErrorBanner from "./ErrorBanner";

interface Policy {
  id: string; policyNumber: string; type: string; premium: number;
  coverage: number; startDate: string; endDate: string;
}

interface Props {
  policy: Policy;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditPolicyModal({ policy, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    type: policy.type,
    premium: String(policy.premium),
    coverage: String(policy.coverage),
    startDate: policy.startDate.slice(0, 10),
    endDate: policy.endDate.slice(0, 10),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.put(`/policies/${policy.id}`, {
        ...form,
        premium: Number(form.premium),
        coverage: Number(form.coverage),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">Edit {policy.policyNumber}</h2>
        {error && <ErrorBanner message={error} />}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Type" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" required
          />
          <input
            type="number" step="0.01" placeholder="Premium" value={form.premium}
            onChange={(e) => setForm({ ...form, premium: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" required
          />
          <input
            type="number" placeholder="Coverage" value={form.coverage}
            onChange={(e) => setForm({ ...form, coverage: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" required
          />
          <input
            type="date" value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" required
          />
          <input
            type="date" value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" required
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}