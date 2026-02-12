import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const fallbackAvatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}&background=16a34a&color=fff`;

export default function Profile({ user, onProfileUpdated }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    avatar: null,
  });
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar || fallbackAvatar(user?.full_name),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFormData({
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      avatar: null,
    });
    setAvatarPreview(user?.avatar || fallbackAvatar(user?.full_name));
  }, [user]);

  const parseResponse = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const syncProfile = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/users/profile/?email=${encodeURIComponent(user.email)}`,
      );
      const result = await parseResponse(response);
      if (!response.ok) {
        throw new Error(result.error || "Unable to load profile");
      }

      if (result.user) {
        setFormData((prev) => ({
          ...prev,
          full_name: result.user.full_name || "",
          email: result.user.email || "",
          phone: result.user.phone || "",
          avatar: null,
        }));
        setAvatarPreview(result.user.avatar || fallbackAvatar(result.user.full_name));
        if (onProfileUpdated) {
          onProfileUpdated(result.user);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      avatar: file,
    }));
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append("email", formData.email);
      payload.append("full_name", formData.full_name);
      payload.append("phone", formData.phone);
      if (formData.avatar) {
        payload.append("avatar", formData.avatar);
      }

      const response = await fetch("http://127.0.0.1:8000/api/users/profile/", {
        method: "POST",
        body: payload,
      });

      const result = await parseResponse(response);
      if (!response.ok) {
        throw new Error(result.error || "Unable to update profile");
      }

      if (result.user) {
        setFormData({
          full_name: result.user.full_name || "",
          email: result.user.email || "",
          phone: result.user.phone || "",
          avatar: null,
        });
        setAvatarPreview(result.user.avatar || fallbackAvatar(result.user.full_name));
        if (onProfileUpdated) {
          onProfileUpdated(result.user);
        }
      }

      setMessage(result.message || "Profile updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-gray-500 hover:text-emerald-600"
        >
          ← Back
        </button>

        <h2 className="text-3xl font-bold text-center text-emerald-600 mb-6">
          My Profile
        </h2>

        {loading && (
          <div className="bg-gray-100 text-gray-700 p-3 rounded-lg mb-4 text-sm">
            Loading latest profile...
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <label className="cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border-2 border-emerald-500">
                <img
                  src={avatarPreview}
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500">Click image to change avatar</p>
          </div>

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

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg font-semibold transition"
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
