import { FileText, ImageIcon, Info, KeyRound } from "lucide-react";
import type { RadiologyExam } from "../types/fhir";

interface RadiologyExamDetailsProps {
  exam: RadiologyExam | null;
}

export function RadiologyExamDetails({ exam }: RadiologyExamDetailsProps) {
  return (
    <section className="exam-details">
      <div className="section-heading">
        <h2>
          <Info size={18} aria-hidden="true" />
          Selected Exam
        </h2>
        <span>{exam?.domainName ?? "No selection"}</span>
      </div>

      {exam ? (
        <>
          <div className="detail-summary">
            <div>
              <strong>{exam.orderName}</strong>
              <span>{[exam.modality, exam.examDate].filter(Boolean).join(" / ")}</span>
            </div>
            <span className={`status-badge ${exam.warnings.length ? "warning" : "success"}`}>{exam.status}</span>
          </div>

          <dl className="detail-list compact">
            <div>
              <dt>Domain</dt>
              <dd>{exam.domainName}</dd>
            </div>
            <div>
              <dt>Patient ID</dt>
              <dd>{exam.patientId}</dd>
            </div>
            <div>
              <dt>Order ID</dt>
              <dd>{exam.orderId ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>ServiceRequest</dt>
              <dd>{exam.serviceRequestId ?? "Not mapped"}</dd>
            </div>
            <div>
              <dt>DiagnosticReport</dt>
              <dd>{exam.diagnosticReportId ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>Accession</dt>
              <dd>{exam.accessionNumber ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>Study ID</dt>
              <dd>{exam.studyId ?? "Not returned"}</dd>
            </div>
          </dl>

          <div className="detail-actions">
            {exam.reportUrl ? (
              <a className="inline-action" href={exam.reportUrl} target="_blank" rel="noreferrer">
                <FileText size={16} aria-hidden="true" />
                Open Report
              </a>
            ) : (
              <span className="availability-pill missing">
                <FileText size={15} aria-hidden="true" />
                {exam.reportLabel}
              </span>
            )}
            {exam.imageViewerUrl ? (
              <a className="inline-action" href={exam.imageViewerUrl} target="_blank" rel="noreferrer">
                <ImageIcon size={16} aria-hidden="true" />
                Open Image Viewer
              </a>
            ) : (
              <span className="availability-pill missing">
                <ImageIcon size={15} aria-hidden="true" />
                {exam.imageLabel}
              </span>
            )}
          </div>

          {exam.warnings.length ? (
            <ul className="exam-warning-list">
              {exam.warnings.map((warning) => (
                <li key={warning}>
                  <KeyRound size={15} aria-hidden="true" />
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="empty-state">Select a radiology exam to inspect report and image launch details.</div>
      )}
    </section>
  );
}
