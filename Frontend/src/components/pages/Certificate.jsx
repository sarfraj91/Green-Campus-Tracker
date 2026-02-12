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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Preparing certificate...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-6 shadow max-w-lg w-full">
          <p className="text-red-600">{error || "Certificate not available."}</p>
        </div>
      </div>
    );
  }

  const approval = order.approval_details || {};
  const treeCount = approval.trees_planted_count || order.number_of_trees || 0;
  const status = (approval.approval_status || "pending").toUpperCase();
  const certificateId = `GCT-${String(
    order.tracking_token || order.id,
  ).toUpperCase()}`;
  const qrValue = encodeURIComponent(
    `${window.location.origin}/track/${order.tracking_token}`,
  );
  const qrUrl = `https://quickchart.io/qr?text=${qrValue}&size=220`;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          #certificate-print,
          #certificate-print * {
            visibility: visible !important;
          }

          #certificate-print {
            position: absolute !important;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="certificate-page min-h-screen bg-gradient-to-b from-emerald-50 via-slate-50 to-white py-12 px-4">
        <div
          id="certificate-print"
          className="max-w-4xl mx-auto bg-white rounded-3xl border border-emerald-100 shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white px-8 py-8">
            <p className="text-xs uppercase tracking-[0.35em] opacity-90">
              Green Campus Tracker
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-3">
              Tree Plantation Certificate
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <p className="bg-white/20 rounded-full px-4 py-1">
                Certificate ID: {certificateId}
              </p>
              <p className="bg-white/20 rounded-full px-4 py-1">Status: {status}</p>
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-8">
            <p className="text-lg md:text-xl leading-relaxed text-slate-700">
              This certifies that{" "}
              <span className="font-bold text-emerald-800">{order.full_name}</span> has
              contributed to plantation of{" "}
              <span className="font-bold text-emerald-800">{treeCount}</span> trees
              through <span className="font-semibold">Green Campus Tracker</span>.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                  Plantation Date
                </p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {formatDate(approval.plantation_date || order.approved_at)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                  Annual Carbon Offset
                </p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {order.impact?.carbon_offset_kg_per_year || 0} kg/year
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-slate-700">
              <p>
                <span className="font-semibold">Plantation Location:</span>{" "}
                {approval.planted_location || order.planting_location || "-"}
              </p>
              <p>
                <span className="font-semibold">Species:</span> {order.tree_species || "-"}
              </p>
              <p>
                <span className="font-semibold">Trees Planted:</span> {treeCount}
              </p>
              <p>
                <span className="font-semibold">Tracking ID:</span> {order.tracking_token}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold">Impact Note:</span>{" "}
                {approval.thank_you_note ||
                  "Your contribution supports biodiversity restoration and long-term carbon capture."}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Authorized Signatory
                </p>
                <p className="text-2xl italic text-emerald-800 mt-1">Sarfaraj Alam</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Scan QR</p>
                  <p className="text-sm text-slate-700">Track plantation status</p>
                </div>
                <img src={qrUrl} alt="Tracking QR" className="w-20 h-20 rounded-lg border" />
              </div>
            </div>

            <div className="no-print flex flex-wrap items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Download Certificate (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
