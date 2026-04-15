import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MetricCard, PageSection, Surface } from "@/components/settl/shared";

const lifecycle = [
  "Draft",
  "Issued",
  "BuyerAcknowledged",
  "FinanceEligible",
  "Funded",
  "Paid",
  "Cleared",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-porcelain text-espresso">
      <header className="sticky top-0 z-30 border-b border-sand bg-porcelain/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-taupe">SETTL</p>
            <p className="text-lg font-semibold text-espresso">Receivables operating system</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/connect">Connect</Link>
            </Button>
            <Button asChild>
              <Link to="/app">
                Open platform
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-grid px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-green/15 bg-mint px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-green-deep">
              <BadgeCheck className="h-4 w-4" />
              Live on HashKey testnet · Safe-ready · KYC-sync ready
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
                Verified receivables, early liquidity, and settlement discipline for modern businesses.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-cocoa md:text-xl">
                SETTL is the receivables operating layer for compliant origination, disciplined
                financing, and auditable settlement on HashKey Chain.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/connect">
                  Open showcase
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/app/analytics">See analytics</Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Live chain"
                value="HashKey"
                detail="Contracts, explorer links, and gas flow run on testnet."
              />
              <MetricCard
                label="Treasury ops"
                value="Safe-ready"
                detail="Admin and treasury controls can route through HashKey Safe."
                tone="positive"
              />
              <MetricCard
                label="Compliance"
                value="KYC-sync"
                detail="Official HashKey KYC path is supported when the SBT address is configured."
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Surface className="space-y-5 bg-card-cream/95">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-espresso">Operating snapshot</p>
                  <p className="text-sm text-taupe">BlueWave Exports → Meridian Retail</p>
                </div>
                <span className="rounded-full border border-green/15 bg-mint px-3 py-1 text-xs font-medium text-green-deep">
                  Finance eligible
                </span>
              </div>
              <div className="rounded-3xl border border-sand bg-card-stone/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-taupe">Receivable</p>
                    <p className="mt-2 text-3xl font-semibold text-espresso">$128,000</p>
                  </div>
                  <div className="rounded-2xl bg-porcelain px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-taupe">Advance</p>
                    <p className="mt-1 text-lg font-semibold text-espresso">$94,720</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Compliance" value="Buyer + seller cleared" />
                  <MiniStat label="Holdback" value="5%" />
                  <MiniStat label="Settlement rail" value="HSP adapter logged" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Feature
                  icon={ShieldCheck}
                  title="Compliance-first"
                  detail="Finance eligibility is gated by entity diligence and buyer acknowledgement."
                />
                <Feature
                  icon={Landmark}
                  title="Institutional capital"
                  detail="LPs inspect jurisdiction, tenor, risk bands, and anomalies before committing."
                />
                <Feature
                  icon={Sparkles}
                  title="Operational analytics"
                  detail="Settlement quality, aging, and counterparties stay visible in one surface."
                />
                <Feature
                  icon={BadgeCheck}
                  title="Audit trail"
                  detail="Document hashes, event feeds, and settlement references remain traceable."
                />
              </div>
            </Surface>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl space-y-10">
          <PageSection
            eyebrow="How it works"
            title="Receivables financing with buyer control and compliance gating"
            description="The buyer confirms the obligation, capital providers inspect risk, and settlement routes through an onchain HSP adapter with visible audit references."
          />
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Seller issues receivable", "Attach a document hash, counterparties, terms, and requested advance."],
              ["Buyer acknowledges", "The buyer explicitly approves or rejects before financing can open."],
              ["Capital funds exposure", "LPs deploy against finance-eligible receivables with holdback discipline."],
              ["Settlement clears with audit trace", "Payments route through the adapter and waterfall into fee, repayment, seller remainder, and optional holdback."],
            ].map(([title, detail]) => (
              <Surface key={title} className="space-y-3">
                <p className="text-lg font-semibold text-espresso">{title}</p>
                <p className="text-sm leading-6 text-taupe">{detail}</p>
              </Surface>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl space-y-8">
          <PageSection
            eyebrow="Receivable lifecycle"
            title="A disciplined lifecycle, not a generic invoice-finance flow"
            description="Buyer acknowledgement, dispute handling, and settlement visibility are first-class primitives in the product and protocol."
          />
          <div className="grid gap-4 md:grid-cols-7">
            {lifecycle.map((step, index) => (
              <Surface key={step} className="space-y-3 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-taupe">Step {index + 1}</p>
                <p className="text-sm font-semibold text-espresso">{step}</p>
              </Surface>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <Surface className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-taupe">Why compliant settlement matters</p>
              <p className="mt-2 text-3xl font-semibold text-espresso">
                Capital only becomes institutional when compliance, acknowledgement, treasury control, and reconciliation are visible by default.
              </p>
              <p className="mt-3 text-sm leading-7 text-cocoa">
                The showcase path is direct: mint test USDC, create a receivable, acknowledge it,
                fund it, settle it, and open the explorer or Safe surfaces without leaving the
                product narrative.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/connect">Launch demo</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/settings">View integration settings</Link>
              </Button>
            </div>
          </Surface>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-sand bg-card-stone/40 p-4">
      <div className="rounded-2xl bg-porcelain p-3 w-fit">
        <Icon className="h-5 w-5 text-espresso" />
      </div>
      <p className="mt-3 text-sm font-semibold text-espresso">{title}</p>
      <p className="mt-1 text-sm leading-6 text-taupe">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-porcelain px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{label}</p>
      <p className="mt-1 text-sm font-medium text-espresso">{value}</p>
    </div>
  );
}
