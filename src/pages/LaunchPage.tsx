import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LoaderCircle, Play } from "lucide-react";
import { beginSmartAuthorization } from "../services/smartClient";

export function LaunchPage() {
  const hasIssuer = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("iss");
  }, []);

  useEffect(() => {
    if (hasIssuer) {
      beginSmartAuthorization();
    }
  }, [hasIssuer]);

  return (
    <main className="launch-shell">
      <div className="launch-panel">
        <div className="launch-icon">
          {hasIssuer ? <LoaderCircle size={30} className="spin" aria-hidden="true" /> : <Play size={30} aria-hidden="true" />}
        </div>
        <h1>{hasIssuer ? "Starting SMART authorization" : "SMART issuer missing"}</h1>
        <p>
          {hasIssuer
            ? "The app is connecting to the SMART authorization server."
            : "This route expects an iss parameter from a SMART standalone or EHR launch."}
        </p>
        {!hasIssuer && (
          <Link className="secondary-action" to="/">
            <ArrowLeft size={18} aria-hidden="true" />
            Back to dashboard
          </Link>
        )}
      </div>
    </main>
  );
}
