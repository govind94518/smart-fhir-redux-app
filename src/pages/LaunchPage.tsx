import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LoaderCircle, Play } from "lucide-react";
import { beginSmartAuthorization } from "../services/smartClient";

export function LaunchPage() {
  const hasLaunchContext = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("iss") && params.has("launch");
  }, []);

  useEffect(() => {
    if (hasLaunchContext) {
      beginSmartAuthorization();
    }
  }, [hasLaunchContext]);

  return (
    <main className="launch-shell">
      <div className="launch-panel">
        <div className="launch-icon">
          {hasLaunchContext ? <LoaderCircle size={30} className="spin" aria-hidden="true" /> : <Play size={30} aria-hidden="true" />}
        </div>
        <h1>{hasLaunchContext ? "Starting SMART authorization" : "SMART launch context missing"}</h1>
        <p>
          {hasLaunchContext
            ? "The app is connecting to the EHR authorization server."
            : "This route expects SMART launch parameters from an EHR or SMART launcher."}
        </p>
        {!hasLaunchContext && (
          <Link className="secondary-action" to="/">
            <ArrowLeft size={18} aria-hidden="true" />
            Back to dashboard
          </Link>
        )}
      </div>
    </main>
  );
}
