const colors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  APPROVED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  EXPIRED: "bg-gray-100 text-gray-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = colors[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
}