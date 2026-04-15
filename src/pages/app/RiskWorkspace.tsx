import { useSettl } from "@/context/settl-context";
import {
  InsightCard,
  PageSection,
  Surface,
} from "@/components/settl/shared";

export default function RiskWorkspace() {
  const { riskScores } = useSettl();

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Risk workspace"
        title="Underwriting context with disciplined, human-readable scoring"
        description="SETTL surfaces confidence, anomaly flags, payer concentration, and recommended terms without relying on vague AI claims."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          title="Average confidence"
          value={`${Math.round(riskScores.reduce((sum, score) => sum + score.expectedSettlementConfidence, 0) / riskScores.length)}%`}
          detail="Weighted by the active receivable set."
          accent="positive"
        />
        <InsightCard
          title="Anomaly count"
          value={riskScores.reduce((sum, score) => sum + score.anomalyFlags.length, 0).toString()}
          detail="Document amendments and payment drift remain the primary drivers."
          accent="warning"
        />
        <InsightCard
          title="Manual review queue"
          value={riskScores.filter((score) => score.band === "Elevated" || score.band === "Watchlist").length.toString()}
          detail="These names require human approval before funding expansion."
        />
      </div>

      <div className="grid gap-4">
        {riskScores.map((score) => (
          <Surface key={score.receivableId} className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-espresso">{score.receivableId.toUpperCase()}</p>
                <p className="text-sm text-taupe">{score.memo}</p>
              </div>
              <div className="rounded-2xl border border-sand bg-card-stone/60 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-taupe">Score</p>
                <p className="text-2xl font-semibold text-espresso">{score.score}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Stat title="Advance recommendation" value={`${score.advanceRateRecommendation}%`} />
              <Stat title="Confidence" value={`${score.expectedSettlementConfidence}%`} />
              <Stat title="Payer concentration" value={`${score.payerConcentration}%`} />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {score.factors.map((factor) => (
                <div key={factor.label} className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-4">
                  <p className="text-sm font-medium text-espresso">{factor.label}</p>
                  <p className="mt-1 text-sm text-cocoa">{factor.detail}</p>
                </div>
              ))}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{title}</p>
      <p className="mt-1 text-lg font-semibold text-espresso">{value}</p>
    </div>
  );
}
