import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Headset, Mail, MessageCircle, Send, Star } from "lucide-react";

const TREES_API_BASE = "http://127.0.0.1:8000/api/trees";
const USERS_API_BASE = "http://127.0.0.1:8000/api/users";

const DEFAULT_SUPPORT_CONTACT = {
  support_email: "support@greencampustracker.com",
  whatsapp_number: "7061609072",
  whatsapp_display: "+91 7061609072",
};

const DEFAULT_REVIEW_SUMMARY = {
  average_rating: 0,
  total_reviews: 0,
  rating_breakdown: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
};

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

const parseApiJson = async (response, fallbackError) => {
  const raw = await response.text();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    if (raw.trim().startsWith("<")) {
      throw new Error(
        `${fallbackError}. Server returned HTML instead of JSON. Restart backend and run migrations.`,
      );
    }
    throw new Error(fallbackError);
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
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [supportContact, setSupportContact] = useState(DEFAULT_SUPPORT_CONTACT);
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  });
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(DEFAULT_REVIEW_SUMMARY);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review_text: "",
  });
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
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

  useEffect(() => {
    const fetchSupportContact = async () => {
      try {
        const response = await fetch(`${USERS_API_BASE}/support/`);
        const data = await parseApiJson(response, "Unable to load support contact");
        if (!response.ok) return;

        setSupportContact((prev) => ({
          ...prev,
          ...data,
        }));
      } catch {
        // Keep fallback contact details when API is unreachable.
      }
    };

    fetchSupportContact();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewLoading(true);
      setReviewError("");
      try {
        const query = user?.email
          ? `?email=${encodeURIComponent(user.email)}`
          : "";
        const response = await fetch(`${USERS_API_BASE}/reviews/${query}`);
        const data = await parseApiJson(response, "Unable to load reviews");

        if (!response.ok) {
          throw new Error(data.error || "Unable to load reviews");
        }

        setReviews(data.reviews || []);
        setReviewSummary(data.summary || DEFAULT_REVIEW_SUMMARY);

        if (data.current_user_review) {
          setReviewForm({
            rating: data.current_user_review.rating || 5,
            review_text: data.current_user_review.review_text || "",
          });
        }
      } catch (err) {
        setReviewError(err.message);
      } finally {
        setReviewLoading(false);
      }
    };

    fetchReviews();
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

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
    if (editingOrderId && editingOrderId !== orderId) {
      setEditingOrderId(null);
    }
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

  const handleSupportChange = (event) => {
    const { name, value } = event.target;
    setSupportForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const sendSupportRequest = async (event) => {
    event.preventDefault();
    setSupportError("");
    setSupportNotice("");

    const trimmedMessage = supportForm.message.trim();
    if (!trimmedMessage) {
      setSupportError("Please describe your issue before sending.");
      return;
    }

    if (!user?.email) {
      setSupportError("Login required to send support request.");
      return;
    }

    setSupportSending(true);
    try {
      const response = await fetch(`${USERS_API_BASE}/support/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: user?.full_name || "",
          email: user.email,
          phone: user?.phone || "",
          subject: supportForm.subject.trim() || "Dashboard support request",
          message: trimmedMessage,
        }),
      });

      const data = await parseApiJson(response, "Unable to send support request");
      if (!response.ok) {
        throw new Error(data.error || "Unable to send support request");
      }

      setSupportNotice(data.message || "Support request sent successfully.");
      setSupportForm((prev) => ({
        ...prev,
        message: "",
      }));
    } catch (err) {
      setSupportError(err.message);
    } finally {
      setSupportSending(false);
    }
  };

  const handleReviewTextChange = (event) => {
    setReviewForm((prev) => ({
      ...prev,
      review_text: event.target.value,
    }));
  };

  const setReviewRating = (ratingValue) => {
    setReviewForm((prev) => ({
      ...prev,
      rating: ratingValue,
    }));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewError("");
    setReviewNotice("");

    if (!user?.email) {
      setReviewError("Login required to submit review.");
      return;
    }

    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
      setReviewError("Please choose a rating from 1 to 5.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const response = await fetch(`${USERS_API_BASE}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: user?.full_name || "",
          email: user.email,
          rating: reviewForm.rating,
          review_text: reviewForm.review_text.trim(),
        }),
      });
      const data = await parseApiJson(response, "Unable to submit review");
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit review");
      }

      setReviewNotice(data.message || "Review submitted successfully.");

      const fetchResponse = await fetch(
        `${USERS_API_BASE}/reviews/?email=${encodeURIComponent(user.email)}`,
      );
      const fetchData = await parseApiJson(fetchResponse, "Unable to refresh reviews");
      if (fetchResponse.ok) {
        setReviews(fetchData.reviews || []);
        setReviewSummary(fetchData.summary || DEFAULT_REVIEW_SUMMARY);
      }
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const renderStars = (ratingValue, size = 16) =>
    Array.from({ length: 5 }, (_, index) => {
      const isFilled = index < ratingValue;
      return (
        <Star
          key={`${ratingValue}-${index}`}
          size={size}
          className={isFilled ? "text-amber-400 fill-amber-400" : "text-gray-300"}
        />
      );
    });

  const rawWhatsApp = (supportContact.whatsapp_number || "").replace(/\D/g, "");
  const whatsappDigits = rawWhatsApp.startsWith("91")
    ? rawWhatsApp
    : rawWhatsApp.length === 10
      ? `91${rawWhatsApp}`
      : rawWhatsApp;
  const whatsappLink = `https://wa.me/${whatsappDigits || "917061609072"}?text=${encodeURIComponent(
    `Hi Support, I need help with my Go Green dashboard.\nName: ${user?.full_name || ""}\nEmail: ${user?.email || ""}`,
  )}`;
  const supportEmail = supportContact.support_email || DEFAULT_SUPPORT_CONTACT.support_email;
  const mailtoBody = `Hi Support,\n\nI need help with:\n\nName: ${user?.full_name || ""}\nEmail: ${user?.email || ""}\n`;
  const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(
    "Go Green Dashboard Support",
  )}&body=${encodeURIComponent(
    mailtoBody,
  )}`;
  const totalReviewCount = reviewSummary.total_reviews || 0;
  const averageRating = Number(reviewSummary.average_rating || 0);

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
                const isExpanded = expandedOrderId === order.id;
                const heroImage =
                  approvalInfo.proof_image_1_url ||
                  approvalInfo.proof_image_2_url ||
                  heroFallback;
                const approvedMapUrl =
                  approvalInfo.planted_map_live_url || approvalInfo.planted_map_url;
                const requestedMapUrl =
                  userInfo.requested_map_live_url || userInfo.requested_map_url;
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
                    <div
                      className="relative h-56 cursor-pointer"
                      onClick={() => toggleExpand(order.id)}
                    >
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

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/certificate/${order.tracking_token}`}
                            className="px-4 py-2 rounded-xl border-2 border-emerald-700 text-emerald-800 font-semibold hover:bg-emerald-50 transition"
                          >
                            View Certificate
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleExpand(order.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                          >
                            {isExpanded ? "Hide Details" : "View Details"}
                          </button>
                        </div>

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

                      {isExpanded && <div className="mt-5 space-y-4 border-t border-gray-200 pt-4">
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
                            {requestedMapUrl && (
                              <p>
                                <a
                                  href={requestedMapUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-700 font-semibold hover:underline"
                                >
                                  View Requested Location on Mapbox
                                </a>
                              </p>
                            )}
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
                              {approvedMapUrl && (
                                <p>
                                  <a
                                    href={approvedMapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-700 font-semibold hover:underline"
                                  >
                                    Open Verified Plantation Location
                                  </a>
                                </p>
                              )}
                              {approvalInfo.planted_map_image_url && (
                                <img
                                  src={approvalInfo.planted_map_image_url}
                                  alt="Verified plantation map pin"
                                  className="w-full h-32 rounded-xl object-cover border border-emerald-100"
                                />
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

                      <div className="flex flex-wrap items-center justify-between gap-3">
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

                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50 transition"
                        >
                          Open Tracking Page
                        </a>
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
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Ratings & Reviews</h2>
              <p className="text-gray-600 mt-1">
                Share your experience and help improve the platform.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-700">
                  {averageRating.toFixed(1)}
                </span>
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(averageRating), 15)}
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                {totalReviewCount} review{totalReviewCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <form
              onSubmit={submitReview}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-gray-800">Your Rating</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setReviewRating(value)}
                    className="p-1 rounded-md hover:bg-amber-50 transition"
                    aria-label={`Rate ${value} star`}
                  >
                    <Star
                      size={24}
                      className={
                        value <= reviewForm.rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-300"
                      }
                    />
                  </button>
                ))}
                <span className="text-sm font-semibold text-gray-600 ml-2">
                  {reviewForm.rating}/5
                </span>
              </div>

              <textarea
                name="review_text"
                rows={4}
                value={reviewForm.review_text}
                onChange={handleReviewTextChange}
                placeholder="Write your review (optional but recommended)"
                className="w-full p-2 rounded-lg border border-gray-300"
              />

              {reviewError && (
                <div className="bg-red-100 text-red-700 p-2 rounded-lg text-sm">
                  {reviewError}
                </div>
              )}

              {reviewNotice && (
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg text-sm">
                  {reviewNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                <Send size={16} />
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>

            <div className="space-y-3">
              {reviewLoading ? (
                <p className="text-gray-600">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-gray-600">No reviews yet. Be the first to review.</p>
              ) : (
                reviews.slice(0, 6).map((review) => (
                  <div
                    key={review.id}
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-gray-800">
                        {review.full_name || "User"}
                      </p>
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating, 14)}
                      </div>
                    </div>
                    {review.review_text ? (
                      <p className="text-sm text-gray-600 mt-2">{review.review_text}</p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-2 italic">No written review</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTime(review.updated_at || review.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Headset size={20} className="text-emerald-600" />
                Need Help?
              </h2>
              <p className="text-gray-600 mt-1">
                Reach support directly on WhatsApp or send an email request.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
              >
                <MessageCircle size={18} />
                WhatsApp Support
              </a>
              <a
                href={mailtoLink}
                className="inline-flex items-center gap-2 border border-emerald-600 text-emerald-700 px-4 py-2 rounded-lg font-medium hover:bg-emerald-50 transition"
              >
                <Mail size={18} />
                Email Support
              </a>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-emerald-800">
                WhatsApp Number
              </p>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {supportContact.whatsapp_display || "+91 7061609072"}
              </p>
              <p className="text-sm font-semibold text-emerald-800 mt-4">
                Support Email
              </p>
              <p className="text-lg font-bold text-emerald-700 mt-1 break-all">
                {supportEmail}
              </p>
            </div>

            <form
              onSubmit={sendSupportRequest}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-gray-800">
                Send Support Request
              </p>

              <input
                type="text"
                name="subject"
                value={supportForm.subject}
                onChange={handleSupportChange}
                placeholder="Subject (optional)"
                className="w-full p-2 rounded-lg border border-gray-300"
              />

              <textarea
                name="message"
                rows={4}
                value={supportForm.message}
                onChange={handleSupportChange}
                placeholder="Describe your issue..."
                className="w-full p-2 rounded-lg border border-gray-300"
              />

              {supportError && (
                <div className="bg-red-100 text-red-700 p-2 rounded-lg text-sm">
                  {supportError}
                </div>
              )}

              {supportNotice && (
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg text-sm">
                  {supportNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={supportSending}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                <Send size={16} />
                {supportSending ? "Sending..." : "Send Request"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
