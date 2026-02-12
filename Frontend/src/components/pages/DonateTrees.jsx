import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const TREES_API_BASE = "http://127.0.0.1:8000/api/trees";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const OBJECTIVE_OPTIONS = [
  "Carbon Offset",
  "Corporate CSR",
  "Memorial Plantation",
  "Gift a Tree",
  "Biodiversity Support",
  "Other",
];

export default function DonateTrees({ user }) {
  const navigate = useNavigate();

  const [config, setConfig] = useState({
    razorpay_key_id: "",
    tree_price_inr: 99,
    currency: "INR",
  });

  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    number_of_trees: 1,
    tree_species: "",
    planting_location: "",
    latitude: "",
    longitude: "",
    objective: OBJECTIVE_OPTIONS[0],
    custom_objective: "",
    dedication_name: "",
    notes: "",
  });

  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totalInr = useMemo(() => {
    const trees = Number(formData.number_of_trees) || 0;
    return trees * Number(config.tree_price_inr || 0);
  }, [formData.number_of_trees, config.tree_price_inr]);

  const selectedLocationMapUrl =
    formData.latitude && formData.longitude
      ? `https://www.mapbox.com/search?query=${encodeURIComponent(
          `${formData.latitude},${formData.longitude}`,
        )}`
      : "";

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    }));
  }, [user]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(`${TREES_API_BASE}/config/`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load payment config");
        setConfig({
          razorpay_key_id: data.razorpay_key_id || "",
          tree_price_inr: data.tree_price_inr || 99,
          currency: data.currency || "INR",
        });
      } catch (err) {
        setError(err.message);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3) {
      setLocationResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingLocations(true);
      try {
        const res = await fetch(
          `${TREES_API_BASE}/geocode/?q=${encodeURIComponent(query)}&country=IN`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to fetch locations");
        setLocationResults(data.results || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoadingLocations(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationInput = (value) => {
    setLocationQuery(value);
    setFormData((prev) => ({
      ...prev,
      planting_location: value,
      latitude: "",
      longitude: "",
    }));
  };

  const handleSelectLocation = (item) => {
    setFormData((prev) => ({
      ...prev,
      planting_location: item.place_name || "",
      latitude: item.latitude ?? "",
      longitude: item.longitude ?? "",
    }));
    setLocationQuery(item.place_name || "");
    setLocationResults([]);
  };

  const buildObjective = () => {
    if (formData.objective !== "Other") return formData.objective;
    return formData.custom_objective.trim();
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const objective = buildObjective();
    if (!objective) {
      setError("Please enter the objective.");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError("Please choose a location from Mapbox suggestions.");
      return;
    }

    setProcessing(true);

    try {
      const orderPayload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        number_of_trees: Number(formData.number_of_trees),
        tree_species: formData.tree_species,
        planting_location: formData.planting_location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        objective,
        dedication_name: formData.dedication_name,
        notes: formData.notes,
      };

      const orderRes = await fetch(`${TREES_API_BASE}/create-order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Unable to create payment order");
      }

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error("Unable to load Razorpay checkout");
      }

      const options = {
        key: orderData.razorpay_key_id || config.razorpay_key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency || config.currency,
        name: "Go Green",
        description: `${formData.number_of_trees} Tree Donation`,
        order_id: orderData.order_id,
        prefill: {
          name: formData.full_name,
          email: formData.email,
          contact: formData.phone,
        },
        notes: {
          location: formData.planting_location,
          objective,
        },
        theme: {
          color: "#059669",
        },
        handler: async (paymentResult) => {
          try {
            const verifyRes = await fetch(`${TREES_API_BASE}/verify-payment/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(paymentResult),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            setMessage(
              "Payment successful. Your donation is confirmed and admin has been notified.",
            );
            setTimeout(() => navigate("/dashboard"), 1500);
          } catch (err) {
            setError(err.message);
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-emerald-600 mb-2">Donate Trees</h2>
        <p className="text-gray-600 mb-6">
          Complete the form, choose planting location via Mapbox, and pay securely
          with Razorpay.
        </p>

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

        <form onSubmit={handlePayment} className="grid md:grid-cols-2 gap-4">
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
          />

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            required
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            min="1"
            name="number_of_trees"
            value={formData.number_of_trees}
            onChange={handleChange}
            placeholder="Number of Trees"
            required
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <input
            type="text"
            name="tree_species"
            value={formData.tree_species}
            onChange={handleChange}
            placeholder="Preferred Tree Species (optional)"
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="relative md:col-span-2">
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="Planting Location (search with Mapbox)"
              required
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {loadingLocations && (
              <p className="text-xs text-gray-500 mt-1">Searching Mapbox...</p>
            )}

            {locationResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 max-h-56 overflow-y-auto">
                {locationResults.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.place_name}-${index}`}
                    onClick={() => handleSelectLocation(item)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                  >
                    {item.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            name="objective"
            value={formData.objective}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {OBJECTIVE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {formData.objective === "Other" ? (
            <input
              type="text"
              name="custom_objective"
              value={formData.custom_objective}
              onChange={handleChange}
              placeholder="Enter your objective"
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          ) : (
            <input
              type="text"
              name="dedication_name"
              value={formData.dedication_name}
              onChange={handleChange}
              placeholder="Dedication Name (optional)"
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}

          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes (optional)"
            rows={4}
            className="md:col-span-2 w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="md:col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Price per tree:{" "}
              <span className="font-semibold">INR {config.tree_price_inr}</span>
            </p>
            <p className="text-lg font-bold text-emerald-700">
              Total: INR {totalInr}
            </p>
            {formData.latitude && formData.longitude && (
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <p>
                  Mapbox pin: {formData.latitude}, {formData.longitude}
                </p>
                {selectedLocationMapUrl && (
                  <a
                    href={selectedLocationMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-emerald-700 font-semibold hover:underline"
                  >
                    Verify selected location on Mapbox
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={processing}
            className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg font-semibold transition"
          >
            {processing ? "Processing Payment..." : "Proceed To Razorpay Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
