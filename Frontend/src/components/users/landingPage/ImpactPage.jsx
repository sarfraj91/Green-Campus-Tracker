import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Leaf,
  ShieldCheck,
  TreePine,
  Wallet,
} from "lucide-react";
import { TREES_API_BASE } from "../../../config/api";

const FALLBACK_IMPACT = {
  trees_planted: 15517,
  co2_offset_kg_per_year: 325936.6,
  donations_inr_total: 7760505,
  active_donors: 1253,
  global_donors: 1249,
  approval_rate_percent: 85,
  community_survival_rate_percent: 85,
  industry_survival_rate_percent: 60,
};

const FALLBACK_MONTHLY_GROWTH = [
  { month: "Jan", trees: 400 },
  { month: "Feb", trees: 300 },
  { month: "Mar", trees: 600 },
  { month: "Apr", trees: 800 },
  { month: "May", trees: 500 },
  { month: "Jun", trees: 900 },
];

const FALLBACK_COMMITMENT = {
  operations_share_percent: 10,
  plantation_share_percent: 90,
  transparency_percent: 100,
  monitoring_support: "24/7",
};

const number = (value, options = {}) =>
  new Intl.NumberFormat("en-IN", options).format(value || 0);

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const VERIFICATION_STEPS = [
  {
    icon: Globe,
    title: "Map Coordinates Captured",
    description:
      "Each plantation record stores location coordinates and order metadata for traceability.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Proof Validation",
    description:
      "Internal admin approval and plantation evidence prevent fake or duplicate reporting.",
  },
  {
    icon: CheckCircle2,
    title: "Publicly Trackable Links",
    description:
      "Donors receive tracking and certificate links so impact can be revisited anytime.",
  },
];

export default function ImpactPage({ isAuthenticated }) {
  const [impact, setImpact] = useState(FALLBACK_IMPACT);
  const [monthlyGrowth, setMonthlyGrowth] = useState(FALLBACK_MONTHLY_GROWTH);
  const [commitment, setCommitment] = useState(FALLBACK_COMMITMENT);

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

        if (Array.isArray(data.growth?.monthly_growth) && data.growth.monthly_growth.length) {
          setMonthlyGrowth(data.growth.monthly_growth);
        }

        if (data.commitment) {
          setCommitment((prev) => ({ ...prev, ...data.commitment }));
        }
      } catch {
        // Keep fallback metrics in local demo mode.
      }
    };

    loadPublicImpact();
    return () => {
      active = false;
    };
  }, []);

  const peakTrees = useMemo(
    () => Math.max(...monthlyGrowth.map((item) => item.trees || 0), 1),
    [monthlyGrowth],
  );

  const stats = [
    {
      label: "TOTAL TREES",
      value: number(impact.trees_planted),
      icon: TreePine,
    },
    {
      label: "CO2 REMOVED (KG / YEAR)",
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
      value: number(impact.active_donors || impact.global_donors),
      icon: Globe,
    },
  ];

  return (
    <main className="bg-[#eef4ef] text-[#10231e]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,#34d399_0%,transparent_38%),radial-gradient(circle_at_80%_0%,#22c55e_0%,transparent_35%),linear-gradient(180deg,#10261f_0%,#183b31_46%,#eef4ef_100%)] opacity-90" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-white">
          <span className="hero-enter-1 pulse-chip inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-md">
            <TreePine className="h-4 w-4 text-emerald-300" />
            Public Impact Dashboard
          </span>
          <h1 className="hero-enter-2 font-display mt-7 max-w-4xl text-5xl font-bold leading-tight md:text-6xl">
            Global Impact Dashboard
          </h1>
          <p className="hero-enter-3 mt-5 max-w-4xl text-xl text-white/85">
            Real-time transparency. See how the community is reforesting the
            planet, one tree at a time.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-6xl px-6 pb-12">
        <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="impact-fade-in interactive-card group flex min-h-[190px] flex-col justify-between rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_20px_45px_rgba(12,44,33,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(12,44,33,0.16)]"
                style={{ animationDelay: `${index * 85}ms` }}
              >
                <div className="mb-5 inline-flex w-fit rounded-2xl bg-emerald-100 p-3 text-emerald-700 transition group-hover:bg-emerald-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-display text-4xl font-bold text-emerald-600 sm:text-[2.55rem]">
                  {card.value}
                </p>
                <p className="mt-2 text-sm font-semibold tracking-[0.2em] text-[#446c61]">
                  {card.label}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-3">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-[0_20px_45px_rgba(12,44,33,0.08)]">
            <h2 className="font-display text-4xl font-bold text-[#0d2a23]">
              Monthly Plantation Growth
            </h2>

            <div className="mt-7 rounded-2xl bg-[#f8fcfa] p-5">
              <div className="relative h-[320px] w-full">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(127,148,139,0.24)_1px,transparent_1px)] [background-size:100%_20%]" />
                <div className="absolute inset-x-2 bottom-0 top-4 flex items-end justify-between gap-3">
                  {monthlyGrowth.map((item, idx) => {
                    const height = Math.max(Math.round((item.trees / peakTrees) * 240), 6);
                    return (
                      <div
                        key={`${item.month}-${item.trees}`}
                        className="flex h-full flex-1 flex-col items-center justify-end"
                      >
                        <div className="mb-2 text-xs font-semibold text-[#4a625b]">
                          {number(item.trees)}
                        </div>
                        <div
                          className="growth-bar w-full max-w-14 rounded-t-xl bg-emerald-600 transition duration-300 hover:scale-y-105 hover:bg-emerald-500"
                          style={{
                            height: `${height}px`,
                            "--bar-delay": `${idx * 80}ms`,
                          }}
                        />
                        <div className="mt-3 text-lg font-semibold text-[#4a625b]">
                          {item.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>

          <article className="commitment-glow rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-8 text-white shadow-[0_20px_50px_rgba(16,185,129,0.32)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_72px_rgba(16,185,129,0.4)]">
            <h2 className="font-display text-4xl font-bold">Our Commitment</h2>
            <p className="mt-5 text-2xl leading-relaxed text-emerald-50">
              Every donation supports verified plantation activity. We keep
              operations lean and maximize direct on-ground climate impact.
            </p>

            <div className="mt-7 rounded-2xl bg-white/15 p-4 text-base text-emerald-50 backdrop-blur-sm">
              {commitment.operations_share_percent}% operations and technology,
              {` ${commitment.plantation_share_percent}% `}direct plantation and care.
            </div>

            <div className="mt-12 grid grid-cols-2 gap-4">
              <div>
                <p className="font-display text-6xl font-bold">
                  {commitment.transparency_percent}%
                </p>
                <p className="mt-1 text-xl text-emerald-50">Transparent</p>
              </div>
              <div>
                <p className="font-display text-6xl font-bold">
                  {commitment.monitoring_support}
                </p>
                <p className="mt-1 text-xl text-emerald-50">Monitoring</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_50px_rgba(16,45,34,0.08)] lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="font-display text-4xl font-bold text-[#0f2b24] md:text-5xl">
              Verification Framework
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#3a5c53]">
              We measure outcomes, not claims. Impact data is tied to donation and
              approval records, which keeps reporting consistent and auditable.
            </p>

            <div className="mt-9 space-y-6">
              {VERIFICATION_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-4">
                    <div className="mt-1 rounded-xl bg-emerald-100 p-3 text-emerald-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-[#12382e]">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-base text-[#3f6359]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-[#f6fbf8] p-6">
            <h3 className="font-display text-3xl font-bold text-[#13372d]">
              Survival Comparison
            </h3>
            <p className="mt-2 text-[#47695f]">
              Community quality benchmark compared against broad industry figures.
            </p>

            <div className="mt-8 space-y-7">
              <div>
                <div className="mb-2 flex items-center justify-between text-lg font-semibold text-[#15352c]">
                  <span>Community Survival Rate</span>
                  <span>{impact.community_survival_rate_percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${impact.community_survival_rate_percent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-lg font-semibold text-[#4a625b]">
                  <span>Industry Average</span>
                  <span>{impact.industry_survival_rate_percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-400"
                    style={{ width: `${impact.industry_survival_rate_percent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-lg font-semibold text-[#4a625b]">
                  <span>Approval Rate</span>
                  <span>{impact.approval_rate_percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#1f8b64]"
                    style={{ width: `${impact.approval_rate_percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? "/donate-trees" : "/signup"}
                className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-400"
              >
                Start Planting
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-full border border-emerald-500 px-6 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
