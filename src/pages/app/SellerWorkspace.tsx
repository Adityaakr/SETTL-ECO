import { useMemo, useState } from "react";
import { CalendarDays, FileText, ShieldCheck, Wallet } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSettl } from "@/context/settl-context";
import {
  ComplianceBadge,
  MetricCard,
  PageSection,
  ReceivableTable,
  Surface,
  TransactionToast,
} from "@/components/settl/shared";
import { currencyFormatter } from "@/domain/formatters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z
  .object({
    sellerEntityName: z.string().min(2),
    buyerEntityOrWallet: z.string().min(2),
    referenceNumber: z.string().min(3),
    amount: z.coerce.number().positive(),
    requestedFinancingAmount: z.coerce.number().positive(),
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    paymentTerms: z.string().min(3),
    currency: z.string().min(3),
    sector: z.string().min(2),
    jurisdiction: z.string().min(2),
    description: z.string().min(8),
    holdbackPercent: z.coerce.number().min(0).max(40),
    memo: z.string().min(3),
    documentHash: z.string().min(10),
    confirmation: z.literal(true, {
      errorMap: () => ({ message: "Confirmation is required" }),
    }),
  })
  .refine((values) => new Date(values.issueDate) <= new Date(values.dueDate), {
    path: ["dueDate"],
    message: "Issue date cannot exceed due date",
  })
  .refine((values) => values.requestedFinancingAmount <= values.amount, {
    path: ["requestedFinancingAmount"],
    message: "Requested financing must be less than or equal to invoice amount",
  });

type FormValues = z.infer<typeof formSchema>;

export default function SellerWorkspace() {
  const {
    createReceivable,
    currentUser,
    mode,
    receivables,
    txStates,
    walletAddress,
  } = useSettl();
  const [open, setOpen] = useState(false);

  const sellerReceivables = useMemo(
    () => receivables.filter((receivable) => receivable.sellerId === currentUser.id),
    [currentUser.id, receivables],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sellerEntityName: currentUser.entityName,
      buyerEntityOrWallet:
        mode.appMode === "live" && walletAddress ? walletAddress : "Meridian Retail",
      referenceNumber: "BW-2081",
      amount: 92000,
      requestedFinancingAmount: 68000,
      issueDate: "2026-04-15",
      dueDate: "2026-05-08",
      paymentTerms: "Net 23",
      currency: "USD",
      sector: "Export Services",
      jurisdiction: "Singapore → Hong Kong",
      description: "Verified export receivable for spring replenishment cycle.",
      holdbackPercent: 0,
      memo: "Buyer expects same-day acknowledgement.",
      documentHash:
        "0x4dd1f657174f13ed192a98fd22a19e0cce92081bbba07e7a43f4d07d3102081a",
      confirmation: true,
    },
  });

  const buyerPlaceholder =
    mode.appMode === "live" && walletAddress ? walletAddress : "Meridian Retail";

  const watched = form.watch();
  const advanceRate =
    watched.amount > 0
      ? Math.round((watched.requestedFinancingAmount / watched.amount) * 100)
      : 0;

  const handleSubmit = form.handleSubmit(async ({ confirmation, ...values }) => {
    await createReceivable(values);
    setOpen(false);
  });

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Seller workspace"
        title="Originate verified receivables and request disciplined liquidity"
        description="Receivables stay non-financeable until the buyer acknowledges and compliance checks remain green across both counterparties."
        action={<ComplianceBadge status={currentUser.complianceStatus} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Open receivables"
          value={sellerReceivables.length.toString()}
          detail={`${currencyFormatter(
            sellerReceivables.reduce((sum, item) => sum + item.amount, 0),
          )} in seller-originated invoices.`}
        />
        <MetricCard
          label="Eligible to finance"
          value={currencyFormatter(
            sellerReceivables
              .filter((item) => item.status === "FinanceEligible")
              .reduce((sum, item) => sum + item.requestedFinancingAmount, 0),
          )}
          detail="Buyer acknowledgement and compliance gating drive this number."
          tone="positive"
        />
        <MetricCard
          label="Entity reputation"
          value={`${currentUser.reliabilityScore}/100`}
          detail={currentUser.recommendedTerms}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <Surface className="space-y-5">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-espresso">Create receivable</p>
            <p className="text-sm leading-6 text-taupe">
              Use a dedicated origination flow instead of a cramped inline form. The modal frames the commercial terms, compliance requirement, and financeability before submission.
            </p>
          </div>

          <div className="grid gap-3">
            <Highlight
              icon={<ShieldCheck className="h-4 w-4 text-green-deep" />}
              title="Buyer acknowledgement required"
              detail="Receivables do not become financeable until the buyer explicitly approves."
            />
            <Highlight
              icon={<Wallet className="h-4 w-4 text-cocoa" />}
              title="Single-wallet live test supported"
              detail="In live mode, use the connected wallet as buyer to demonstrate the full lifecycle quickly."
            />
            <Highlight
              icon={<FileText className="h-4 w-4 text-cocoa" />}
              title="Document hash captured"
              detail="Attachment and memo fields stay visible in the draft summary before submission."
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">Open receivable draft</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-[28px] border border-sand bg-porcelain p-0 shadow-[0_24px_80px_rgba(47,35,30,0.16)]">
              <div className="grid min-h-[760px] xl:grid-cols-[1.15fr_0.85fr]">
                <div className="border-b border-sand/80 p-6 xl:border-b-0 xl:border-r xl:p-8">
                  <DialogHeader className="space-y-3 text-left">
                    <div className="inline-flex w-fit items-center rounded-full border border-green/20 bg-mint px-3 py-1 text-xs font-medium text-green-deep">
                      Origination draft
                    </div>
                    <DialogTitle className="text-3xl font-semibold tracking-tight text-espresso">
                      Create a verified receivable
                    </DialogTitle>
                    <DialogDescription className="max-w-2xl text-sm leading-6 text-cocoa">
                      Capture the commercial terms, attach the document hash, and submit a clean draft that can move from issuance to buyer acknowledgement and financing.
                    </DialogDescription>
                  </DialogHeader>

                  <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
                    <Section
                      title="Counterparties"
                      description="Define the seller and buyer entities exactly as they should appear in the operating record."
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Seller entity name"
                          error={form.formState.errors.sellerEntityName?.message}
                        >
                          <Input
                            {...form.register("sellerEntityName")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Buyer entity or wallet"
                          error={form.formState.errors.buyerEntityOrWallet?.message}
                        >
                          <Input
                            {...form.register("buyerEntityOrWallet")}
                            placeholder={buyerPlaceholder}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section
                      title="Commercial terms"
                      description="Set the invoice amount, requested financing, and timing terms."
                    >
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Field
                          label="Invoice / reference number"
                          error={form.formState.errors.referenceNumber?.message}
                        >
                          <Input
                            {...form.register("referenceNumber")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field label="Amount" error={form.formState.errors.amount?.message}>
                          <Input
                            type="number"
                            {...form.register("amount", { valueAsNumber: true })}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Requested financing"
                          error={form.formState.errors.requestedFinancingAmount?.message}
                        >
                          <Input
                            type="number"
                            {...form.register("requestedFinancingAmount", { valueAsNumber: true })}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Issue date"
                          error={form.formState.errors.issueDate?.message}
                        >
                          <Input
                            type="date"
                            {...form.register("issueDate")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field label="Due date" error={form.formState.errors.dueDate?.message}>
                          <Input
                            type="date"
                            {...form.register("dueDate")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Payment terms"
                          error={form.formState.errors.paymentTerms?.message}
                        >
                          <Input
                            {...form.register("paymentTerms")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section
                      title="Context and metadata"
                      description="Provide the currency, sector, jurisdiction, memo, and supporting document reference."
                    >
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Field label="Currency" error={form.formState.errors.currency?.message}>
                          <Input
                            {...form.register("currency")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field label="Sector" error={form.formState.errors.sector?.message}>
                          <Input
                            {...form.register("sector")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Holdback %"
                          error={form.formState.errors.holdbackPercent?.message}
                        >
                          <Input
                            type="number"
                            {...form.register("holdbackPercent", { valueAsNumber: true })}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Jurisdiction"
                          error={form.formState.errors.jurisdiction?.message}
                          className="md:col-span-2 lg:col-span-3"
                        >
                          <Input
                            {...form.register("jurisdiction")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Memo"
                          error={form.formState.errors.memo?.message}
                          className="md:col-span-2 lg:col-span-3"
                        >
                          <Input
                            {...form.register("memo")}
                            className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                        <Field
                          label="Attachment / document hash"
                          error={form.formState.errors.documentHash?.message}
                          className="md:col-span-2 lg:col-span-3"
                        >
                          <Input
                            {...form.register("documentHash")}
                            className="h-12 rounded-2xl border-sand bg-card-stone font-mono text-xs text-espresso"
                          />
                        </Field>
                        <Field
                          label="Description"
                          error={form.formState.errors.description?.message}
                          className="md:col-span-2 lg:col-span-3"
                        >
                          <Textarea
                            rows={5}
                            {...form.register("description")}
                            className="rounded-2xl border-sand bg-card-stone text-espresso"
                          />
                        </Field>
                      </div>
                    </Section>

                    <label className="flex items-start gap-3 rounded-2xl border border-sand bg-card-stone/60 px-4 py-4">
                      <input
                        type="checkbox"
                        {...form.register("confirmation")}
                        className="mt-1 h-4 w-4 rounded border-sand"
                      />
                      <span className="text-sm leading-6 text-cocoa">
                        Confirm document references, counterparty details, and requested financing terms before submission.
                      </span>
                    </label>
                    <FieldError error={form.formState.errors.confirmation?.message} />

                    <div className="flex flex-col gap-3 border-t border-sand/70 pt-6 sm:flex-row sm:justify-end">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Submit receivable</Button>
                    </div>
                  </form>
                </div>

                <div className="bg-warm-canvas/65 p-6 xl:p-8">
                  <div className="sticky top-0 space-y-5">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-taupe">
                        Draft summary
                      </p>
                      <h3 className="text-2xl font-semibold text-espresso">
                        {watched.referenceNumber || "Untitled receivable"}
                      </h3>
                      <p className="text-sm leading-6 text-cocoa">
                        Review the receivable before it enters the buyer acknowledgement and financing pipeline.
                      </p>
                    </div>

                    <SummaryCard
                      title="Face value"
                      value={currencyFormatter(watched.amount || 0, watched.currency || "USD")}
                      detail={`${advanceRate || 0}% indicative advance against ${currencyFormatter(
                        watched.requestedFinancingAmount || 0,
                        watched.currency || "USD",
                      )}.`}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <MiniMetric
                        icon={<CalendarDays className="h-4 w-4 text-cocoa" />}
                        label="Due date"
                        value={watched.dueDate || "Not set"}
                      />
                      <MiniMetric
                        icon={<Wallet className="h-4 w-4 text-cocoa" />}
                        label="Buyer"
                        value={watched.buyerEntityOrWallet || "Not set"}
                      />
                    </div>

                    <Surface className="space-y-3 rounded-[24px] bg-card-cream">
                      <p className="text-sm font-medium text-espresso">Execution path</p>
                      <ol className="space-y-3 text-sm text-cocoa">
                        <li>1. Seller submits a verified receivable draft.</li>
                        <li>2. Buyer acknowledgement unlocks finance eligibility.</li>
                        <li>3. LP capital can be committed once the gate clears.</li>
                        <li>4. Settlement routes through the HSP adapter with audit visibility.</li>
                      </ol>
                    </Surface>

                    <Surface className="space-y-3 rounded-[24px] bg-card-cream">
                      <p className="text-sm font-medium text-espresso">Captured metadata</p>
                      <div className="space-y-2 text-sm text-cocoa">
                        <SummaryRow label="Sector" value={watched.sector || "—"} />
                        <SummaryRow label="Jurisdiction" value={watched.jurisdiction || "—"} />
                        <SummaryRow label="Payment terms" value={watched.paymentTerms || "—"} />
                        <SummaryRow
                          label="Holdback"
                          value={`${watched.holdbackPercent || 0}%`}
                        />
                      </div>
                    </Surface>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Surface>

        <div className="space-y-6">
          <ReceivableTable receivables={sellerReceivables.slice(0, 5)} />
          <TransactionToast
            state={Object.values(txStates)[0] ?? "idle"}
            label="Latest settlement transaction"
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-lg font-semibold text-espresso">{title}</p>
        <p className="text-sm leading-6 text-taupe">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-2 ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-taupe">
        {label}
      </span>
      {children}
      <FieldError error={error} />
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-red-soft">{error}</p>;
}

function Highlight({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-card-stone/40 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-card-cream p-2">{icon}</div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-espresso">{title}</p>
          <p className="text-sm leading-6 text-taupe">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-sand bg-card-cream p-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-taupe">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-espresso">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-cocoa">{detail}</p>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-card-cream p-4">
      <div className="mb-2 flex items-center gap-2">{icon}</div>
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-espresso">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-taupe">{label}</span>
      <span className="text-right font-medium text-espresso">{value}</span>
    </div>
  );
}
