import { AlertTriangle, CheckCircle2, FileText, ImageIcon, MousePointerClick } from "lucide-react";
import type { RadiologyExam } from "../types/fhir";

interface RadiologyResultsTableProps {
  exams: RadiologyExam[];
  selectedExamId?: string;
  onSelect: (examId: string) => void;
}

export function RadiologyResultsTable({ exams, selectedExamId, onSelect }: RadiologyResultsTableProps) {
  return (
    <section className="radiology-results">
      <div className="section-heading">
        <h2>
          <MousePointerClick size={18} aria-hidden="true" />
          Cross-Domain Radiology Results
        </h2>
        <span>{exams.length} exams</span>
      </div>

      {exams.length ? (
        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Exam Date</th>
                <th>Radiology Order</th>
                <th>Report</th>
                <th>Image Study</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr className={exam.id === selectedExamId ? "selected" : undefined} key={exam.id} onClick={() => onSelect(exam.id)}>
                  <td>
                    <strong>{exam.domainName}</strong>
                    <span>{exam.patientId}</span>
                  </td>
                  <td>{formatDate(exam.examDate)}</td>
                  <td>
                    <strong>{exam.orderName}</strong>
                    <span>{[exam.modality, exam.accessionNumber].filter(Boolean).join(" / ") || "No modality details"}</span>
                  </td>
                  <td>{reportControl(exam)}</td>
                  <td>{imageControl(exam)}</td>
                  <td>
                    <span className={`status-badge ${exam.warnings.length ? "warning" : "success"}`}>
                      {exam.warnings.length ? <AlertTriangle size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                      {exam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No radiology exams matched the current filters.</div>
      )}
    </section>
  );
}

function reportControl(exam: RadiologyExam) {
  if (exam.reportUrl) {
    return (
      <a className="inline-action" href={exam.reportUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
        <FileText size={16} aria-hidden="true" />
        View Report
      </a>
    );
  }

  return (
    <span className={`availability-pill ${exam.reportAvailable ? "ready" : "missing"}`}>
      <FileText size={15} aria-hidden="true" />
      {exam.reportLabel}
    </span>
  );
}

function imageControl(exam: RadiologyExam) {
  if (exam.imageViewerUrl) {
    return (
      <a className="inline-action" href={exam.imageViewerUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
        <ImageIcon size={16} aria-hidden="true" />
        View Image
      </a>
    );
  }

  return (
    <span className={`availability-pill ${exam.imageAvailable ? "ready" : "missing"}`}>
      <ImageIcon size={15} aria-hidden="true" />
      {exam.imageLabel}
    </span>
  );
}

function formatDate(value: string) {
  if (!value || value === "Date unavailable") {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}
