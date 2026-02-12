import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const TREES_API_BASE = "http://127.0.0.1:8000/api/trees";

const paymentBadge = {
  paid: "bg-emerald-100 text-emerald-700",
  created: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

const approvalBadge = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const heroFallback =
  "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80";

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
    rejected_orders: 0,
    unpaid_orders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    number_of_trees: 1,
    tree_species: "",
    planting_location: "",
    latitude: "",
    longitude: "",
    objective: "",
    dedication_name: "",
    notes: "",
  });

  const totals = useMemo(() => {
    const totalTrees = orders.reduce(
      (acc, order) => acc + (order.number_of_trees || 0),
      0,
    );
    const totalSpent = orders
      .filter((order) => order.payment_status === "paid")
      .reduce((acc, order) => acc + (order.amount_paise || 0), 0);
    return {
      totalTrees,
      totalSpentInr: (totalSpent / 100).toFixed(2),
    };
  }, [orders]);

  const fetchOrders = async () => {
    if (!user?.email) {
      setOrders([]);
      setSummary({
        total_orders: 0,
        completed_orders: 0,
        pending_orders: 0,
        rejected_orders: 0,
        unpaid_orders: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${TREES_API_BASE}/orders/?email=${encodeURIComponent(user.email)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load orders");
      }
      setOrders(data.orders || []);
      setSummary(
        data.summary || {
          total_orders: 0,
          completed_orders: 0,
          pending_orders: 0,
          rejected_orders: 0,
          unpaid_orders: 0,
        },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const startEdit = (order) => {
    setMessage("");
    setError("");
    setEditingOrderId(order.id);
    setEditForm({
      full_name: order.full_name || "",
      phone: order.phone || "",
      number_of_trees: order.number_of_trees || 1,
      tree_species: order.tree_species || "",
      planting_location: order.planting_location || "",
      latitude: order.latitude ?? "",
      longitude: order.longitude ?? "",
      objective: order.objective || "",
      dedication_name: order.dedication_name || "",
      notes: order.notes || "",
    });
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveEdit = async (orderId) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...editForm,
        email: user.email,
        number_of_trees: Number(editForm.number_of_trees),
        latitude:
          editForm.latitude === "" || editForm.latitude === null
            ? null
            : Number(editForm.latitude),
        longitude:
          editForm.longitude === "" || editForm.longitude === null
            ? null
            : Number(editForm.longitude),
      };

      const response = await fetch(`${TREES_API_BASE}/orders/${orderId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update order");
      }

      setMessage("Order updated successfully. Admin approval will refresh after review.");
      setEditingOrderId(null);
      await fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (orderId) => {
    const confirmed = window.confirm("Delete this order from your dashboard?");
    if (!confirmed) return;

    setDeletingOrderId(orderId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${TREES_API_BASE}/orders/${orderId}/?email=${encodeURIComponent(user.email)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete order");
      }

      setMessage("Order removed from your dashboard.");
      await fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">Dashboard</h1>
          <p className="text-gray-700">
            Welcome, <span className="font-semibold">{user?.full_name || "User"}</span>.
            Track your plantations, approvals, and impact certificates.
          </p>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.total_orders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">Completed Orders</p>
            <p className="text-2xl font-bold text-emerald-700">
              {summary.completed_orders}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-600">{summary.pending_orders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">Total Trees</p>
            <p className="text-2xl font-bold text-emerald-700">{totals.totalTrees}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">Total Paid (INR)</p>
            <p className="text-2xl font-bold text-emerald-700">{totals.totalSpentInr}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Your Orders</h2>
            <button
              onClick={() => navigate("/donate-trees")}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Donate More Trees
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg mb-4 text-sm">
              {message}
            </div>
          )}

          {loading ? (
            <p className="text-gray-600">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-600">No orders yet. Start by donating trees.</p>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const userInfo = order.user_order_details || {};
                const approvalInfo = order.approval_details || {};
                const heroImage =
                  approvalInfo.proof_image_1_url ||
                  approvalInfo.proof_image_2_url ||
                  heroFallback;
                const trackingUrl =
                  order.tracking_url ||
                  `${window.location.origin}/track/${order.tracking_token}`;
                const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
                  trackingUrl,
                )}&size=130`;
                const impact = order.impact?.carbon_offset_kg_per_year || 0;

                return (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-3xl overflow-hidden bg-white"
                  >
                    <div className="relative h-56">
                      <img
                        src={heroImage}
                        alt="Plantation Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            paymentBadge[order.payment_status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.payment_status.toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            approvalBadge[order.approval_status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {(order.approval_status || "pending").toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute left-6 bottom-6 text-white">
                        <p className="text-sm opacity-90">Order #{order.id}</p>
                        <p className="text-3xl font-semibold">
                          {order.tree_species || "Native Species"}
                        </p>
                        <p className="text-sm opacity-90">
                          {approvalInfo.planted_location ||
                            userInfo.planting_location ||
                            order.planting_location}
                        </p>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                        <div className="bg-emerald-50 rounded-2xl p-4">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                            Planted
                          </p>
                          <p className="text-lg font-semibold text-gray-800">
                            {formatDate(
                              approvalInfo.plantation_date ||
                                approvalInfo.approved_at ||
                                order.approved_at,
                            )}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-4">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                            Offset
                          </p>
                          <p className="text-lg font-semibold text-gray-800">
                            {impact} kg/yr
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-4 col-span-2 md:col-span-1">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                            Trees
                          </p>
                          <p className="text-lg font-semibold text-gray-800">
                            {approvalInfo.trees_planted_count || order.number_of_trees}
                          </p>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                          <h3 className="text-sm font-bold text-gray-900 mb-3">
                            Your Order Details
                          </h3>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p>
                              <span className="font-semibold">Name:</span>{" "}
                              {userInfo.full_name || order.full_name}
                            </p>
                            <p>
                              <span className="font-semibold">Requested Trees:</span>{" "}
                              {userInfo.number_of_trees || order.number_of_trees}
                            </p>
                            <p>
                              <span className="font-semibold">Objective:</span>{" "}
                              {userInfo.objective || order.objective}
                            </p>
                            <p>
                              <span className="font-semibold">Requested Location:</span>{" "}
                              {userInfo.planting_location || order.planting_location}
                            </p>
                            <p>
                              <span className="font-semibold">Dedication:</span>{" "}
                              {userInfo.dedication_name || order.dedication_name || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Notes:</span>{" "}
                              {userInfo.notes || order.notes || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Created:</span>{" "}
                              {formatDateTime(userInfo.created_at || order.created_at)}
                            </p>
                            <p>
                              <span className="font-semibold">Amount:</span> INR{" "}
                              {((userInfo.amount_paise || order.amount_paise || 0) / 100).toFixed(
                                2,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                          <h3 className="text-sm font-bold text-gray-900 mb-3">
                            Approval Section
                          </h3>
                          {order.approval_status === "approved" ? (
                            <div className="space-y-2 text-sm text-gray-700">
                              <p>
                                <span className="font-semibold">Approved At:</span>{" "}
                                {formatDateTime(approvalInfo.approved_at || order.approved_at)}
                              </p>
                              <p>
                                <span className="font-semibold">Planted Location:</span>{" "}
                                {approvalInfo.planted_location || "-"}
                              </p>
                              <p>
                                <span className="font-semibold">Plantation Date:</span>{" "}
                                {formatDate(approvalInfo.plantation_date)}
                              </p>
                              <p>
                                <span className="font-semibold">Trees Planted:</span>{" "}
                                {approvalInfo.trees_planted_count || "-"}
                              </p>
                              <p>
                                <span className="font-semibold">Thank You Note:</span>{" "}
                                {approvalInfo.thank_you_note || "-"}
                              </p>
                              <p>
                                <span className="font-semibold">Update:</span>{" "}
                                {approvalInfo.plantation_update || "-"}
                              </p>
                              {approvalInfo.planted_map_url && (
                                <p>
                                  <a
                                    href={approvalInfo.planted_map_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-700 font-semibold hover:underline"
                                  >
                                    Open Verified Plantation Location
                                  </a>
                                </p>
                              )}
                              {(approvalInfo.proof_image_1_url ||
                                approvalInfo.proof_image_2_url) && (
                                <div className="pt-2">
                                  <p className="font-semibold mb-2">Proof Images</p>
                                  <div className="flex gap-2">
                                    {approvalInfo.proof_image_1_url && (
                                      <a
                                        href={approvalInfo.proof_image_1_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img
                                          src={approvalInfo.proof_image_1_url}
                                          alt="Proof 1"
                                          className="w-20 h-20 rounded-lg object-cover border"
                                        />
                                      </a>
                                    )}
                                    {approvalInfo.proof_image_2_url && (
                                      <a
                                        href={approvalInfo.proof_image_2_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img
                                          src={approvalInfo.proof_image_2_url}
                                          alt="Proof 2"
                                          className="w-20 h-20 rounded-lg object-cover border"
                                        />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              {order.approval_status === "rejected"
                                ? "Admin has marked this order as rejected. You can edit and submit details again."
                                : "Pending admin approval. Plantation proof and verified details will appear here."}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(order)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            disabled={deletingOrderId === order.id}
                            className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 transition"
                          >
                            {deletingOrderId === order.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            to={`/certificate/${order.tracking_token}`}
                            className="px-4 py-2 rounded-xl border-2 border-emerald-700 text-emerald-800 font-semibold hover:bg-emerald-50 transition"
                          >
                            View Certificate
                          </Link>
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                            title="Scan to track order"
                          >
                            <img
                              src={qrUrl}
                              alt="Track QR"
                              className="w-16 h-16 rounded-lg border border-gray-200"
                            />
                          </a>
                        </div>
                      </div>

                      {editingOrderId === order.id && (
                        <div className="mt-4 space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-gray-800">
                            Edit Your Order Details
                          </p>
                          <div className="grid md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              name="full_name"
                              value={editForm.full_name}
                              onChange={handleEditChange}
                              placeholder="Full Name"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="tel"
                              name="phone"
                              value={editForm.phone}
                              onChange={handleEditChange}
                              placeholder="Phone"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="number"
                              min="1"
                              name="number_of_trees"
                              value={editForm.number_of_trees}
                              onChange={handleEditChange}
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="text"
                              name="tree_species"
                              value={editForm.tree_species}
                              onChange={handleEditChange}
                              placeholder="Tree Species"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="text"
                              name="planting_location"
                              value={editForm.planting_location}
                              onChange={handleEditChange}
                              placeholder="Planting Location"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="text"
                              name="objective"
                              value={editForm.objective}
                              onChange={handleEditChange}
                              placeholder="Objective"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="text"
                              name="latitude"
                              value={editForm.latitude}
                              onChange={handleEditChange}
                              placeholder="Latitude (optional)"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="text"
                              name="longitude"
                              value={editForm.longitude}
                              onChange={handleEditChange}
                              placeholder="Longitude (optional)"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                            <input
                              type="text"
                              name="dedication_name"
                              value={editForm.dedication_name}
                              onChange={handleEditChange}
                              placeholder="Dedication Name"
                              className="w-full p-2 rounded-lg border border-gray-300"
                            />
                          </div>
                          <textarea
                            name="notes"
                            rows={3}
                            value={editForm.notes}
                            onChange={handleEditChange}
                            placeholder="Notes"
                            className="w-full p-2 rounded-lg border border-gray-300"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(order.id)}
                              disabled={saving}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
