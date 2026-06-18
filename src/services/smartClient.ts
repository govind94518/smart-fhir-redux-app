import { buildCernerTutorialSummary, CERNER_TUTORIAL_OBSERVATION_CODES } from "./cernerTutorialSummary";
import type { Bundle, ClinicalSummary, FhirResource, ObservationResource, PatientResource } from "../types/fhir";

type SmartClient = {
  state?: {
    serverUrl?: string;
    tokenResponse?: {
      patient?: string;
      encounter?: string;
      scope?: string;
    };
  };
  patient?: {
    id?: string;
    read: () => Promise<PatientResource>;
  };
  request: <T = unknown>(url: string, options?: Record<string, unknown>) => Promise<T>;
};

const DEMO_FHIR_BASE_URL = import.meta.env.VITE_DEMO_FHIR_BASE_URL ?? "https://r4.smarthealthit.org";
const SMART_CLIENT_ID = import.meta.env.VITE_SMART_CLIENT_ID ?? "my_web_app";
const SMART_SCOPE =
  import.meta.env.VITE_SMART_SCOPE ??
  "patient/Patient.read patient/Observation.read launch/patient online_access openid profile";

let activeClient: SmartClient | null = null;

export function beginSmartAuthorization() {
  getFHIR().oauth2.authorize({
    clientId: SMART_CLIENT_ID,
    scope: SMART_SCOPE,
    redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
  });
}

export async function readySmartClient() {
  activeClient = (await getFHIR().oauth2.ready()) as SmartClient;
  return activeClient;
}

export function connectDemoClient() {
  activeClient = createFetchClient(DEMO_FHIR_BASE_URL);
  return activeClient;
}

export function hasSmartCallbackParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  return params.has("code") || params.has("state") || params.has("iss");
}

export async function clearSmartSession() {
  activeClient = null;
  const fhir = window.FHIR;

  if (fhir?.oauth2.logout) {
    await fhir.oauth2.logout();
    return;
  }

  window.sessionStorage.clear();
}

export async function loadClinicalSummary(mode: "smart" | "demo"): Promise<ClinicalSummary> {
  const client = getActiveClient();
  const patient = await readPatient(client);
  const patientId = patient.id ?? client.patient?.id ?? client.state?.tokenResponse?.patient;

  if (!patientId) {
    throw new Error("FHIR server did not return a patient id.");
  }

  const [medications, observations, tutorialObservations, conditions, encounters] = await Promise.all([
    safeRequestResources(`/MedicationRequest?patient=${encodeURIComponent(patientId)}&_count=12`),
    safeRequestResources(`/Observation?patient=${encodeURIComponent(patientId)}&category=laboratory&_sort=-date&_count=12`),
    safeRequestResources(
      `/Observation?patient=${encodeURIComponent(patientId)}&code=${encodeURIComponent(CERNER_TUTORIAL_OBSERVATION_CODES)}&_count=50`,
    ),
    safeRequestResources(`/Condition?patient=${encodeURIComponent(patientId)}&_count=12`),
    safeRequestResources(`/Encounter?patient=${encodeURIComponent(patientId)}&_sort=-date&_count=8`),
  ]);
  const tutorialResources = tutorialObservations.resources as ObservationResource[];
  const observationResources = observations.resources as ObservationResource[];

  return {
    mode,
    serverUrl: client.state?.serverUrl ?? DEMO_FHIR_BASE_URL,
    patientId,
    patient,
    cernerTutorial: buildCernerTutorialSummary(patient, tutorialResources),
    medications: medications.resources,
    observations: observationResources,
    conditions: conditions.resources,
    encounters: encounters.resources,
    warnings: [
      ...medications.warnings,
      ...observations.warnings,
      ...tutorialObservations.warnings,
      ...conditions.warnings,
      ...encounters.warnings,
    ],
  };
}

function getActiveClient() {
  if (!activeClient) {
    throw new Error("FHIR client is not initialized.");
  }

  return activeClient;
}

function getFHIR() {
  if (!window.FHIR) {
    throw new Error("SMART JavaScript client has not loaded.");
  }

  return window.FHIR;
}

function createFetchClient(serverUrl: string): SmartClient {
  return {
    state: {
      serverUrl,
    },
    request: async <T>(url: string) => {
      const response = await fetch(toFhirUrl(serverUrl, url), {
        headers: {
          Accept: "application/fhir+json, application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    },
  };
}

function toFhirUrl(serverUrl: string, path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${serverUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function readPatient(client: SmartClient): Promise<PatientResource> {
  if (client.patient?.id) {
    return client.patient.read();
  }

  const patientId = client.state?.tokenResponse?.patient;
  if (patientId) {
    return client.request<PatientResource>(`/Patient/${encodeURIComponent(patientId)}`);
  }

  const bundle = await client.request<Bundle<PatientResource>>("/Patient?_count=1");
  const patient = resourcesFromBundle<PatientResource>(bundle)[0];

  if (!patient) {
    throw new Error("No patient was available from the selected FHIR server.");
  }

  return patient;
}

async function safeRequestResources(path: string) {
  try {
    const result = await getActiveClient().request<Bundle<FhirResource>>(path);
    return {
      resources: resourcesFromBundle(result),
      warnings: [] as string[],
    };
  } catch (error) {
    return {
      resources: [] as FhirResource[],
      warnings: [`${path.split("?")[0].replace("/", "")}: ${errorMessage(error)}`],
    };
  }
}

function resourcesFromBundle<T extends FhirResource>(value: Bundle<T> | T[] | T): T[] {
  const resources: T[] = [];
  const append = (item: Bundle<T> | T) => {
    if (isBundle(item)) {
      item.entry?.forEach((entry) => {
        if (entry.resource) {
          append(entry.resource);
        }
      });
      return;
    }

    resources.push(item);
  };

  if (Array.isArray(value)) {
    value.forEach(append);
    return resources;
  }

  append(value);
  return resources;
}

function isBundle<T extends FhirResource>(value: Bundle<T> | T): value is Bundle<T> {
  return value.resourceType === "Bundle" && "entry" in value;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown FHIR request error";
}
