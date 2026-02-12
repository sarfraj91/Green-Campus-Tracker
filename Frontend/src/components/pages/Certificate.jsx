import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TREES_API_BASE = "http://127.0.0.1:8000/api/trees";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

export default function Certificate() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${TREES_API_BASE}/track/${token}/`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load certificate details");
        }
        setOrder(data.order);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchOrder();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Preparing certificate...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-6 shadow max-w-lg w-full">
          <p className="text-red-600">{error || "Certificate not available."}</p>
        </div>
      </div>
    );
  }

  const approval = order.approval_details || {};
  const treeCount = approval.trees_planted_count || order.number_of_trees || 0;
  const qrValue = encodeURIComponent(
    `${window.location.origin}/track/${order.tracking_token}`,
  );
  const qrUrl = `https://quickchart.io/qr?text=${qrValue}&size=180`;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-emerald-200 shadow-xl overflow-hidden">
        <div className="bg-emerald-700 text-white px-8 py-6">
          <p className="text-sm uppercase tracking-widest opacity-90">Go Green</p>
          <h1 className="text-3xl font-bold mt-2">Tree Plantation Certificate</h1>
          <p className="opacity-90 mt-2">Certificate ID: GREEN-{order.id}</p>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-lg text-gray-700">
            This certifies that{" "}
            <span className="font-bold text-emerald-700">{order.full_name}</span> has
            contributed to plantation of{" "}
            <span className="font-bold text-emerald-700">{treeCount}</span> trees through
            Go Green.
          </p>

          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Plantation Location:</span>{" "}
              {approval.planted_location || order.planting_location || "-"}
            </p>
            <p>
              <span className="font-semibold">Plantation Date:</span>{" "}
              {formatDate(approval.plantation_date || order.approved_at)}
            </p>
            <p>
              <span className="font-semibold">Species:</span> {order.tree_species || "-"}
            </p>
            <p>
              <span className="font-semibold">Annual Carbon Offset:</span>{" "}
              {order.impact?.carbon_offset_kg_per_year || 0} kg/year
            </p>
            <p className="md:col-span-2">
              <span className="font-semibold">Impact Statement:</span>{" "}
              {approval.thank_you_note ||
                "Your contribution supports biodiversity restoration and carbon capture."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => window.print()}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
            >
              Print Certificate
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Scan QR</p>
                <p className="text-sm text-gray-700">Track plantation status</p>
              </div>
              <img src={qrUrl} alt="Tracking QR" className="w-20 h-20 rounded-lg border" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
