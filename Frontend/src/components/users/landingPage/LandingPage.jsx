import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Globe,
  Leaf,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  TreePine,
  Wallet,
} from "lucide-react";
import { TREES_API_BASE, USERS_API_BASE } from "../../../config/api";

const FALLBACK_IMPACT = {
  trees_planted: 15517,
  co2_offset_kg_per_year: 325936.6,
  donations_inr_total: 7760505,
  active_donors: 1249,
  approval_rate_percent: 85,
  community_survival_rate_percent: 85,
  industry_survival_rate_percent: 60,
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

const FEATURES = [
  {
    icon: Globe,
    title: "GPS Tracking",
    body: "Every plantation request is linked to real map coordinates so anyone can verify where trees are growing.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Impact",
    body: "Orders move from payment to admin approval with proof updates so impact is transparent, not assumed.",
  },
  {
    icon: TreePine,
    title: "Species Diversity",
    body: "Native and climate-appropriate tree choices improve biodiversity and long-term campus resilience.",
  },
];

const number = (value, options = {}) =>
  new Intl.NumberFormat("en-IN", options).format(value || 0);

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

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

const formatReviewDate = (value) => {
  if (!value) return "Recently";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
};

const getInitials = (name) => {
  const safeName = (name || "").trim();
  if (!safeName) return "GG";

  const parts = safeName.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() || "")
    .join("");
  return initials || "GG";
};

export default function LandingPage({ isAuthenticated }) {
  const [impact, setImpact] = useState(FALLBACK_IMPACT);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(DEFAULT_REVIEW_SUMMARY);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPublicImpact = async () => {
      try {
        const response = await fetch(`${TREES_API_BASE}/public-impact/`);
        const data = await response.json();
        if (!response.ok || !active) return;

        setImpact((prev) => ({
          ...prev,
          ...(data.metrics || {}),
          ...(data.benchmarks || {}),
        }));
      } catch {
        // Keep fallback numbers when API is unavailable in local setup.
      }
    };

    loadPublicImpact();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadPublicReviews = async () => {
      setReviewsLoading(true);
      setReviewsError("");

      try {
        const response = await fetch(`${USERS_API_BASE}/reviews/`);
        const data = await parseApiJson(response, "Unable to load community reviews");
        if (!response.ok || !active) {
          throw new Error(data.error || "Unable to load community reviews");
        }

        setReviews(data.reviews || []);
        setReviewSummary(data.summary || DEFAULT_REVIEW_SUMMARY);
      } catch (error) {
        if (!active) return;
        setReviews([]);
        setReviewSummary(DEFAULT_REVIEW_SUMMARY);
        setReviewsError(error.message || "Unable to load community reviews");
      } finally {
        if (active) {
          setReviewsLoading(false);
        }
      }
    };

    loadPublicReviews();
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: "TOTAL TREES",
      value: number(impact.trees_planted),
      icon: TreePine,
    },
    {
      label: "CO2 OFFSET (KG / YEAR)",
      value: number(impact.co2_offset_kg_per_year, {
        maximumFractionDigits: 0,
      }),
      icon: Leaf,
    },
    {
      label: "DONATIONS (INR)",
      value: inr(impact.donations_inr_total),
      icon: Wallet,
    },
    {
      label: "ACTIVE DONORS",
      value: number(impact.active_donors),
      icon: Globe,
    },
  ];

  const averageRating = Number(reviewSummary.average_rating || 0);
  const totalReviews = Number(reviewSummary.total_reviews || 0);
  const renderStars = (ratingValue, size = 14) =>
    Array.from({ length: 5 }, (_, index) => {
      const isFilled = index < Number(ratingValue || 0);
      return (
        <Star
          key={`${ratingValue}-${index}`}
          size={size}
          className={isFilled ? "fill-amber-400 text-amber-400" : "text-slate-300"}
        />
      );
    });

  return (
    <div className="bg-[#eef4ef] text-[#10221d]">
      <section className="relative min-h-[82vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2200&q=80"
          alt="Forest at sunrise"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07130f]/70 via-[#07130f]/55 to-[#eef4ef]" />

        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-6xl items-center px-6 py-20">
          <div className="w-full text-center text-white">
            <span className="hero-enter-1 pulse-chip inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold tracking-wide backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Live Impact Tracker
            </span>

            <h1 className="hero-enter-2 font-display mx-auto mt-8 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
              Plant Trees.
              <span className="block text-emerald-400">Heal The Planet.</span>
            </h1>

            <p className="hero-enter-3 mx-auto mt-6 max-w-3xl text-lg text-white/85 md:text-2xl">
              Join the green movement to offset carbon footprints. Track every
              plantation and watch measurable impact grow over time.
            </p>

            <div className="hero-enter-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={isAuthenticated ? "/donate-trees" : "/signup"}
                className="btn-sheen group inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-[0_14px_40px_rgba(16,185,129,0.38)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-400 sm:w-auto"
              >
                Plant a Tree Now
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/impact"
                className="btn-sheen inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto"
              >
                View Public Impact
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-14 max-w-6xl px-6 pb-14">
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="impact-fade-in interactive-card group flex min-h-[210px] flex-col justify-between rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_45px_rgba(12,44,33,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(12,44,33,0.16)]"
                style={{ animationDelay: `${index * 85}ms` }}
              >
                <div className="mb-6 inline-flex w-fit rounded-2xl bg-emerald-100 p-3 text-emerald-700 transition group-hover:bg-emerald-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-display text-4xl font-bold text-emerald-600 sm:text-[2.55rem]">
                  {item.value}
                </p>
                <p className="mt-2 text-sm font-semibold tracking-[0.2em] text-emerald-900/65">
                  {item.label}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl font-bold text-[#0f2b24] md:text-5xl">
            Complete Transparency
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-[#33554c]">
            We believe in showing, not just telling. Each donation is trackable,
            auditable, and built for long-term trust.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="impact-fade-in interactive-card group rounded-3xl border border-emerald-100 bg-[#f6fbf8] p-8 shadow-[0_20px_45px_rgba(11,54,38,0.06)] transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_28px_70px_rgba(11,54,38,0.13)]"
                style={{ animationDelay: `${index * 110}ms` }}
              >
                <div className="mb-6 inline-flex rounded-2xl bg-emerald-100 p-4 text-emerald-700 transition group-hover:bg-emerald-200">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-3xl font-bold text-[#102e27]">
                  {feature.title}
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-[#3d5f56]">
                  {feature.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-stretch gap-10 rounded-[2rem] bg-[#f4faf6] p-8 shadow-[0_22px_50px_rgba(14,45,34,0.08)] lg:grid-cols-2 lg:p-12">
          <div className="relative overflow-hidden rounded-3xl">
            <img
              src="https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1400&q=80"
              alt="Planting a sapling"
              className="h-full min-h-[320px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#062017]/55 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              <Leaf className="h-4 w-4 text-emerald-300" />
              Verified campus plantation
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h2 className="font-display text-5xl font-bold leading-tight text-[#0d2a23]">
              Our Impact vs.
              <span className="block text-emerald-600">Global Need</span>
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-[#33554c]">
              While deforestation continues at an alarming pace, our community is
              pushing back with verified plantation and consistent survival
              monitoring.
            </p>

            <div className="mt-10 space-y-7">
              <div>
                <div className="mb-2 flex items-center justify-between text-lg font-semibold text-[#15352c]">
                  <span>Our Survival Rate</span>
                  <span>{impact.community_survival_rate_percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${impact.community_survival_rate_percent}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-lg font-semibold text-[#415a53]">
                  <span>Industry Average</span>
                  <span>{impact.industry_survival_rate_percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all duration-700"
                    style={{
                      width: `${impact.industry_survival_rate_percent}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <Link
              to="/impact"
              className="btn-sheen group mt-9 inline-flex w-fit items-center gap-2 rounded-full bg-[#0d2a23] px-7 py-3 text-base font-semibold text-white transition hover:bg-[#14392f]"
            >
              Explore Public Impact Report
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        <div className="rounded-[2rem] border border-emerald-100/80 bg-gradient-to-br from-[#f7fcf9] via-[#eef7f2] to-[#f9fdfb] p-8 shadow-[0_24px_60px_rgba(10,62,45,0.08)] lg:p-10">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-4xl font-bold text-[#0f2b24] md:text-5xl">
                Community Reviews
              </h2>
              <p className="mt-3 max-w-2xl text-lg text-[#345a50]">
                Public feedback from all users planting through Go Green.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e6d64]">
                  Average Rating
                </p>
                <p className="font-display mt-1 text-3xl font-bold text-emerald-600">
                  {averageRating.toFixed(1)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e6d64]">
                  Total Reviews
                </p>
                <p className="font-display mt-1 text-3xl font-bold text-emerald-600">
                  {number(totalReviews)}
                </p>
              </div>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="rounded-2xl border border-emerald-100 bg-white/80 px-5 py-4 text-[#31574d]">
              Loading user reviews...
            </div>
          ) : reviewsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
              {reviewsError}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-emerald-100 bg-white/80 px-5 py-4 text-[#31574d]">
              No public reviews yet. Be the first to share your experience.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {reviews.map((review, index) => (
                <article
                  key={review.id}
                  className="review-fade-in interactive-card review-card rounded-3xl border border-white/85 bg-white/90 p-5 shadow-[0_18px_45px_rgba(10,56,41,0.09)]"
                  style={{ "--review-delay": `${index * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {review.avatar ? (
                      <img
                        src={review.avatar}
                        alt={`${review.full_name || "User"} avatar`}
                        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-emerald-100"
                      />
                    ) : (
                      <div className="review-avatar-placeholder h-12 w-12 shrink-0 rounded-full">
                        {getInitials(review.full_name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-[#103227]">
                        {review.full_name || "Go Green User"}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#56756c]">
                        {formatReviewDate(review.updated_at || review.created_at)}
                      </p>
                    </div>

                    <Quote className="h-5 w-5 shrink-0 text-emerald-300" />
                  </div>

                  <div className="mt-4 flex items-center gap-1">
                    {renderStars(review.rating, 15)}
                    <span className="ml-2 text-sm font-semibold text-[#34574e]">
                      {review.rating}/5
                    </span>
                  </div>

                  <p className="mt-3 text-[0.98rem] leading-relaxed text-[#2d5348]">
                    {review.review_text ||
                      "Shared a rating without written feedback."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
