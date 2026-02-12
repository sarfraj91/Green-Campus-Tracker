import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

const TREES_API_BASE = "http://127.0.0.1:8000/api/trees";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

export default function OrderTracking() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const heroImage = useMemo(() => {
    if (order?.approval_details?.proof_image_1_url) {
      return order.approval_details.proof_image_1_url;
    }
    if (order?.approval_details?.proof_image_2_url) {
      return order.approval_details.proof_image_2_url;
    }
    return "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80";
  }, [order]);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${TREES_API_BASE}/track/${token}/`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load tracking details");
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
        <p className="text-gray-600">Loading tracking details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-6 shadow max-w-lg w-full">
          <p className="text-red-600">{error || "Tracking record not found."}</p>
        </div>
      </div>
    );
  }

  const approval = order.approval_details || {};
  const userOrder = order.user_order_details || {};
  const mapUrl = approval.planted_map_url || userOrder.requested_map_url;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
        <div className="relative h-64">
          <img src={heroImage} alt="Native Species" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <div className="absolute left-6 bottom-6 text-white">
            <p className="text-4xl font-semibold tracking-tight">
              {userOrder.tree_species || "Native Species"}
            </p>
            <p className="text-sm mt-1 opacity-90">
              {approval.planted_location || userOrder.planting_location || "Plantation Site"}
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Planted
              </p>
              <p className="text-xl font-semibold text-gray-800">
                {formatDate(approval.plantation_date || order.approved_at)}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Offset
              </p>
              <p className="text-xl font-semibold text-gray-800">
                {order.impact?.carbon_offset_kg_per_year || 0} kg/yr
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700 mb-6">
            <p>
              <span className="font-semibold">Order #:</span> {order.id}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              {(approval.approval_status || "pending").toUpperCase()}
            </p>
            <p>
              <span className="font-semibold">Trees:</span>{" "}
              {approval.trees_planted_count || order.number_of_trees}
            </p>
            <p>
              <span className="font-semibold">Impact Note:</span>{" "}
              {approval.plantation_update || "Plantation update will appear after admin approval."}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/certificate/${order.tracking_token}`}
              className="px-5 py-3 rounded-xl border-2 border-emerald-700 text-emerald-800 font-semibold hover:bg-emerald-50 transition"
            >
              View Certificate
            </Link>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Open Map
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
