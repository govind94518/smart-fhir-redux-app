import type { LucideIcon } from "lucide-react";
import type { FhirResource } from "../types/fhir";
import { resourceMeta, resourceTitle } from "../features/clinical/formatters";

interface ResourcePanelProps {
  title: string;
  countLabel: string;
  resources: FhirResource[];
  icon: LucideIcon;
}

export function ResourcePanel({ title, countLabel, resources, icon: Icon }: ResourcePanelProps) {
  return (
    <section className="resource-panel">
      <div className="section-heading">
        <h2>
          <Icon size={18} aria-hidden="true" />
          {title}
        </h2>
        <span>{countLabel}</span>
      </div>
      <div className="resource-list">
        {resources.length > 0 ? (
          resources.map((resource) => (
            <article className="resource-item" key={`${resource.resourceType}-${resource.id ?? resourceTitle(resource)}`}>
              <h3>{resourceTitle(resource)}</h3>
              <p>{resourceMeta(resource) || resource.id || "No extra detail returned"}</p>
            </article>
          ))
        ) : (
          <div className="empty-state">No matching resources returned.</div>
        )}
      </div>
    </section>
  );
}
