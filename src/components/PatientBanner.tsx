import { CalendarDays, Hash, UserRound } from "lucide-react";
import { patientAge, patientName } from "../features/clinical/formatters";
import type { PatientResource } from "../types/fhir";

interface PatientBannerProps {
  patient: PatientResource | null;
  patientId?: string;
}

export function PatientBanner({ patient, patientId }: PatientBannerProps) {
  return (
    <section className="patient-banner" aria-label="Current patient">
      <div className="patient-identity">
        <div className="avatar" aria-hidden="true">
          <UserRound size={30} />
        </div>
        <div>
          <h1>{patientName(patient)}</h1>
          <div className="demographics">
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              {patient?.birthDate ?? "Birth date unavailable"}
            </span>
            <span>{patientAge(patient)}</span>
            <span>{patient?.gender ?? "Gender unavailable"}</span>
          </div>
        </div>
      </div>
      <div className="patient-id">
        <Hash size={16} aria-hidden="true" />
        <span>{patientId ?? patient?.id ?? "No patient id"}</span>
      </div>
    </section>
  );
}
