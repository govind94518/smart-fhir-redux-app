interface ResourceMixProps {
  medications: number;
  observations: number;
  conditions: number;
  encounters: number;
}

const labels = [
  { key: "medications", label: "Medications", className: "bar-teal" },
  { key: "observations", label: "Labs", className: "bar-blue" },
  { key: "conditions", label: "Conditions", className: "bar-rose" },
  { key: "encounters", label: "Encounters", className: "bar-amber" },
] as const;

export function ResourceMix(props: ResourceMixProps) {
  const max = Math.max(1, ...labels.map((item) => props[item.key]));

  return (
    <section className="resource-mix" aria-label="FHIR resource counts">
      <div className="section-heading">
        <h2>FHIR Resource Mix</h2>
        <span>{labels.reduce((sum, item) => sum + props[item.key], 0)} resources</span>
      </div>
      <div className="bars">
        {labels.map((item) => {
          const value = props[item.key];
          const width = `${Math.max(8, (value / max) * 100)}%`;

          return (
            <div className="bar-row" key={item.key}>
              <div className="bar-label">
                <span>{item.label}</span>
                <strong>{value}</strong>
              </div>
              <div className="bar-track">
                <div className={`bar-fill ${item.className}`} style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
