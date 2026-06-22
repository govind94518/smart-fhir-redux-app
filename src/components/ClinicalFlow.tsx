import { DatabaseZap, FolderSync, LogIn, MonitorCheck, ShieldCheck, UserRound } from "lucide-react";

interface ClinicalFlowProps {
  status: "idle" | "loading" | "succeeded" | "failed";
  hasSummary: boolean;
}

const steps = [
  { label: "Launch", icon: LogIn },
  { label: "Authorize", icon: ShieldCheck },
  { label: "Patient", icon: UserRound },
  { label: "Domains", icon: DatabaseZap },
  { label: "Merge", icon: FolderSync },
  { label: "Render", icon: MonitorCheck },
];

export function ClinicalFlow({ status, hasSummary }: ClinicalFlowProps) {
  const activeIndex = status === "idle" ? -1 : status === "loading" ? 3 : hasSummary ? steps.length - 1 : 0;

  return (
    <section className="flow-strip" aria-label="SMART on FHIR data flow">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const state = index <= activeIndex ? "complete" : index === activeIndex + 1 && status === "loading" ? "active" : "pending";

        return (
          <div className={`flow-step ${state}`} key={step.label}>
            <div className="flow-icon">
              <Icon size={18} aria-hidden="true" />
            </div>
            <span>{step.label}</span>
          </div>
        );
      })}
    </section>
  );
}
