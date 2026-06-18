import { useEffect } from "react";
import { Activity, AlertTriangle, ClipboardList, FlaskConical, LogIn, LogOut, Pill, RefreshCcw, Stethoscope, TestTube2 } from "lucide-react";
import { CernerTutorialPanel } from "../components/CernerTutorialPanel";
import { ClinicalFlow } from "../components/ClinicalFlow";
import { PatientBanner } from "../components/PatientBanner";
import { ResourceMix } from "../components/ResourceMix";
import { ResourcePanel } from "../components/ResourcePanel";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  endClinicalSession,
  refreshClinicalSummary,
  startDemoSession,
  startSmartSession,
} from "../features/clinical/clinicalSlice";
import { hasSmartCallbackParams } from "../services/smartClient";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { status, summary, error, mode } = useAppSelector((state) => state.clinical);
  const isLoading = status === "loading";

  useEffect(() => {
    if (status === "idle" && hasSmartCallbackParams()) {
      dispatch(startSmartSession());
    }
  }, [dispatch, status]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SMART on FHIR</p>
          <h1>Patient Summary</h1>
        </div>
        <div className="actions">
          <button className="icon-button text-button" type="button" onClick={() => dispatch(startSmartSession())} disabled={isLoading} title="Resume SMART session">
            <LogIn size={18} aria-hidden="true" />
            SMART
          </button>
          <button className="icon-button text-button" type="button" onClick={() => dispatch(startDemoSession())} disabled={isLoading} title="Load demo patient">
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

      <CernerTutorialPanel summary={summary?.cernerTutorial} />

      <div className="dashboard-grid">
        <ResourceMix
          medications={summary?.medications.length ?? 0}
          observations={summary?.observations.length ?? 0}
          conditions={summary?.conditions.length ?? 0}
          encounters={summary?.encounters.length ?? 0}
        />

        <section className="warnings-panel">
          <div className="section-heading">
            <h2>
              <Activity size={18} aria-hidden="true" />
              Request Status
            </h2>
            <span>{summary?.warnings.length ?? 0} warnings</span>
          </div>
          {isLoading ? (
            <div className="loading-line">Loading clinical resources...</div>
          ) : summary?.warnings.length ? (
            <ul className="warning-list">
              {summary.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">All configured resource calls completed.</div>
          )}
        </section>
      </div>

      <div className="resource-grid">
        <ResourcePanel title="Medications" countLabel={`${summary?.medications.length ?? 0} found`} resources={summary?.medications ?? []} icon={Pill} />
        <ResourcePanel title="Lab Observations" countLabel={`${summary?.observations.length ?? 0} found`} resources={summary?.observations ?? []} icon={FlaskConical} />
        <ResourcePanel title="Conditions" countLabel={`${summary?.conditions.length ?? 0} found`} resources={summary?.conditions ?? []} icon={ClipboardList} />
        <ResourcePanel title="Encounters" countLabel={`${summary?.encounters.length ?? 0} found`} resources={summary?.encounters ?? []} icon={Stethoscope} />
      </div>
    </main>
  );
}
