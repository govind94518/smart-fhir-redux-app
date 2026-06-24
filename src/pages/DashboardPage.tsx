import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, DatabaseZap, FileText, ImageIcon, LogIn, LogOut, RefreshCcw, Search, TestTube2 } from "lucide-react";
import { ClinicalFlow } from "../components/ClinicalFlow";
import { PatientBanner } from "../components/PatientBanner";
import { RadiologyExamDetails } from "../components/RadiologyExamDetails";
import { RadiologyResultsTable } from "../components/RadiologyResultsTable";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  endClinicalSession,
  refreshClinicalSummary,
  startDemoSession,
  startSmartSession,
} from "../features/clinical/clinicalSlice";
import { hasSmartCallbackParams } from "../services/smartClient";

type AvailabilityFilter = "all" | "ready" | "missing-report" | "missing-image";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { status, summary, error, mode } = useAppSelector((state) => state.clinical);
  const [domainFilter, setDomainFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string>();
  const isLoading = status === "loading";
  const exams = summary?.radiology.exams ?? [];
  const domains = summary?.radiology.domains ?? [];
  const requestStatuses = summary?.radiology.requestStatuses ?? [];

  useEffect(() => {
    if (status === "idle" && hasSmartCallbackParams()) {
      dispatch(startSmartSession());
    }
  }, [dispatch, status]);

  const filteredExams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesDomain = domainFilter === "all" || exam.domainId === domainFilter;
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "ready" && exam.reportAvailable && exam.imageAvailable) ||
        (availabilityFilter === "missing-report" && !exam.reportAvailable) ||
        (availabilityFilter === "missing-image" && !exam.imageAvailable);
      const matchesQuery =
        !normalizedQuery ||
        [exam.orderName, exam.modality, exam.accessionNumber, exam.studyId, exam.orderId, exam.domainName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesDomain && matchesAvailability && matchesQuery;
    });
  }, [availabilityFilter, domainFilter, exams, query]);

  const selectedExam = filteredExams.find((exam) => exam.id === selectedExamId) ?? filteredExams[0] ?? null;
  const reportCount = exams.filter((exam) => exam.reportAvailable).length;
  const imageCount = exams.filter((exam) => exam.imageAvailable).length;
  const configuredDomains = domains.filter((domain) => domain.configured).length;
  const diagnosticReportCount = requestCount(requestStatuses, "DiagnosticReport");
  const serviceRequestCount = requestCount(requestStatuses, "ServiceRequest");
  const hasFilteredOutReports = diagnosticReportCount > reportCount && !summary?.radiology.fallbackDemo;
  const reportMetricValue = hasFilteredOutReports ? `${reportCount}/${diagnosticReportCount}` : String(reportCount);
  const reportMetricLabel = hasFilteredOutReports ? "Reports matched/returned" : "Reports";
  const examMetricHint =
    diagnosticReportCount || serviceRequestCount ? `${diagnosticReportCount} DiagnosticReports, ${serviceRequestCount} orders returned` : undefined;
  const reportMetricHint = hasFilteredOutReports ? "Only radiology-coded reports become exams" : undefined;
  const imageMetricHint = exams.length ? `${imageCount} of ${exams.length} exams ready` : "No radiology exams";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SMART on FHIR radiology POC</p>
          <h1>SMART Radiology Viewer</h1>
        </div>
        <div className="actions">
          <button className="icon-button text-button" type="button" onClick={() => dispatch(startSmartSession())} disabled={isLoading} title="Resume SMART session">
            <LogIn size={18} aria-hidden="true" />
            SMART
          </button>
          <button className="icon-button text-button" type="button" onClick={() => dispatch(startDemoSession())} disabled={isLoading} title="Load demo radiology data">
            <TestTube2 size={18} aria-hidden="true" />
            Demo
          </button>
          <button className="icon-button" type="button" onClick={() => dispatch(refreshClinicalSummary())} disabled={isLoading || !summary} title="Refresh data">
            <RefreshCcw size={18} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={() => dispatch(endClinicalSession())} disabled={isLoading} title="Clear session">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <ClinicalFlow status={status} hasSummary={Boolean(summary)} />

      {error && (
        <section className="alert" role="alert">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>{error}</span>
        </section>
      )}

      <section className="status-row">
        <div>
          <span>Mode</span>
          <strong>{mode ?? "Not connected"}</strong>
        </div>
        <div>
          <span>FHIR server</span>
          <strong>{summary?.serverUrl ?? "No server selected"}</strong>
        </div>
        <div>
          <span>Load state</span>
          <strong>{status}</strong>
        </div>
      </section>

      <PatientBanner patient={summary?.patient ?? null} patientId={summary?.patientId} />

      {summary ? (
        <>
          <section className="radiology-metrics" aria-label="Radiology summary">
            <Metric icon={<DatabaseZap size={18} aria-hidden="true" />} label="Domains configured" value={`${configuredDomains}/${domains.length}`} />
            <Metric icon={<Search size={18} aria-hidden="true" />} label="Radiology exams" value={String(exams.length)} hint={examMetricHint} />
            <Metric icon={<FileText size={18} aria-hidden="true" />} label={reportMetricLabel} value={reportMetricValue} hint={reportMetricHint} />
            <Metric icon={<ImageIcon size={18} aria-hidden="true" />} label="Image studies" value={String(imageCount)} hint={imageMetricHint} />
          </section>

          {summary.radiology.fallbackDemo && (
            <section className="alert demo-note" role="status">
              <AlertTriangle size={20} aria-hidden="true" />
              <span>Demo mode is showing sample POC rows because the public FHIR server did not return radiology exam data.</span>
            </section>
          )}

          <div className="radiology-layout">
            <aside className="filter-panel" aria-label="Radiology filters">
              <div className="section-heading">
                <h2>
                  <Search size={18} aria-hidden="true" />
                  Filters
                </h2>
              </div>

              <label>
                Domain
                <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}>
                  <option value="all">All domains</option>
                  {domains.map((domain) => (
                    <option value={domain.id} key={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Availability
                <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as AvailabilityFilter)}>
                  <option value="all">All exams</option>
                  <option value="ready">Report + image ready</option>
                  <option value="missing-report">Missing report</option>
                  <option value="missing-image">Missing image</option>
                </select>
              </label>

              <label>
                Search
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, accession, study ID" />
              </label>

              <div className="domain-list">
                {domains.map((domain) => (
                  <div className={domain.configured ? "domain-card configured" : "domain-card"} key={domain.id}>
                    <strong>{domain.name}</strong>
                    <span>{domain.configured ? domain.serverUrl : "Not configured"}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="radiology-main">
              <RadiologyResultsTable exams={filteredExams} selectedExamId={selectedExam?.id} onSelect={setSelectedExamId} />
              <RadiologyExamDetails exam={selectedExam} />
            </div>
          </div>
        </>
      ) : (
        <section className="empty-state landing-empty">
          Launch from PowerChart or load Demo to see cross-domain radiology reports and image studies.
        </section>
      )}
    </main>
  );
}

function Metric({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="metric-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
        {hint ? <em>{hint}</em> : null}
      </div>
    </div>
  );
}

function requestCount(statuses: Array<{ label: string; count?: number; status: string }>, label: string) {
  return statuses.reduce((total, status) => {
    if (status.label !== label || status.status !== "succeeded") {
      return total;
    }

    return total + (status.count ?? 0);
  }, 0);
}
