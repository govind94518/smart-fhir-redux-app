import { Gauge, HeartPulse, Ruler, UserRound } from "lucide-react";
import type { CernerTutorialSummary } from "../types/fhir";

interface CernerTutorialPanelProps {
  summary?: CernerTutorialSummary;
}

const demographicRows = [
  ["First Name", "firstName"],
  ["Last Name", "lastName"],
  ["Gender", "gender"],
  ["Date of Birth", "birthDate"],
  ["Age", "age"],
] as const;

const observationRows = [
  ["Height", "height", Ruler],
  ["Systolic Blood Pressure", "systolicBp", HeartPulse],
  ["Diastolic Blood Pressure", "diastolicBp", HeartPulse],
  ["LDL", "ldl", Gauge],
  ["HDL", "hdl", Gauge],
] as const;

export function CernerTutorialPanel({ summary }: CernerTutorialPanelProps) {
  return (
    <section className="tutorial-panel">
      <div className="section-heading">
        <h2>
          <UserRound size={18} aria-hidden="true" />
          Cerner Tutorial View
        </h2>
        <span>Patient + Observation</span>
      </div>

      <div className="tutorial-tables">
        <div>
          <h3>Patient Resource</h3>
          <dl className="detail-list">
            {demographicRows.map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{summary?.[key] ?? "Not loaded"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3>Observation Resource</h3>
          <dl className="detail-list observation-details">
            {observationRows.map(([label, key, Icon]) => (
              <div key={key}>
                <dt>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </dt>
                <dd>{summary?.[key] ?? "Not loaded"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
