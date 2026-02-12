import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function VerifyOTP({ onLogin }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  const parseResponse = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const handleVerify = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/verify-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await parseResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      if (onLogin && data.user) {
        onLogin(data.user);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/resend-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Unable to resend OTP");
      }

      setMessage(data.message || "OTP sent again.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center text-emerald-600 mb-3">
          Verify Email
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter the OTP sent to your email to complete registration.
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

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg font-semibold transition"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full border border-emerald-600 text-emerald-700 p-3 rounded-lg font-semibold transition hover:bg-emerald-50"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;
