import { AlertTriangle, CheckCircle2, CircleSlash, Network } from "lucide-react";
import type { ApiRequestStatus } from "../types/fhir";

interface RadiologyRequestPanelProps {
  statuses: ApiRequestStatus[];
  warnings: string[];
}

export function RadiologyRequestPanel({ statuses, warnings }: RadiologyRequestPanelProps) {
  const warningCount = statuses.filter((status) => status.status !== "succeeded").length + warnings.length;

  return (
    <section className="request-panel">
      <div className="section-heading">
        <h2>
          <Network size={18} aria-hidden="true" />
          Request Status
        </h2>
        <span>{warningCount} warnings</span>
      </div>

      {statuses.length ? (
        <ul className="request-list">
          {statuses.map((item) => (
            <li className={item.status} key={item.id}>
              <div className="request-icon">{statusIcon(item.status)}</div>
              <div>
                <strong>
                  {item.domainName} / {item.label}
                </strong>
                <span>{item.message ?? `${item.count ?? 0} returned from ${item.path}`}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">No API requests have run yet.</div>
      )}
    </section>
  );
}

function statusIcon(status: ApiRequestStatus["status"]) {
  if (status === "succeeded") {
    return <CheckCircle2 size={17} aria-hidden="true" />;
  }

  if (status === "warning") {
    return <AlertTriangle size={17} aria-hidden="true" />;
  }

  return <CircleSlash size={17} aria-hidden="true" />;
}
