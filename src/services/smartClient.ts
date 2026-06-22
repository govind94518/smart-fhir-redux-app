import type {
  ApiRequestStatus,
  Bundle,
  ClinicalSummary,
  CodeableConcept,
  DiagnosticReportResource,
  FhirResource,
  PatientResource,
  RadiologyDomain,
  RadiologyExam,
  Reference,
  ServiceRequestResource,
} from "../types/fhir";

type SmartClient = {
  state?: {
    serverUrl?: string;
    tokenResponse?: {
      access_token?: string;
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

type DomainRuntime = RadiologyDomain & {
  requestWithActiveClient: boolean;
};

type ResourceRequestResult<T extends FhirResource> = {
  resources: T[];
  status: ApiRequestStatus;
};

type ValueRequestResult<T> = {
  value: T | null;
  status: ApiRequestStatus;
};

const DEMO_FHIR_BASE_URL = import.meta.env.VITE_DEMO_FHIR_BASE_URL ?? "https://r4.smarthealthit.org";
const SMART_CLIENT_ID = import.meta.env.VITE_SMART_CLIENT_ID ?? "my_web_app";
const SMART_PROVIDER_SCOPE =
  "patient/Patient.read patient/Encounter.read patient/DiagnosticReport.read patient/ServiceRequest.read patient/Binary.read launch openid fhirUser";
const SMART_PATIENT_SCOPE =
  "patient/Patient.read patient/Encounter.read patient/DiagnosticReport.read patient/ServiceRequest.read patient/Binary.read launch/patient online_access openid profile";
const MAX_EXAM_INFO_REQUESTS = 12;

let activeClient: SmartClient | null = null;

export function beginSmartAuthorization() {
  getFHIR().oauth2.authorize({
    clientId: SMART_CLIENT_ID,
    scope: getSmartScope(),
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

  const serverUrl = client.state?.serverUrl ?? DEMO_FHIR_BASE_URL;
  const domains = buildRadiologyDomains(client, patientId, serverUrl);
  const domainResults = await Promise.all(domains.map((domain) => loadDomainRadiology(client, domain, patient)));
  const requestStatuses = domainResults.flatMap((result) => result.requestStatuses);
  const warnings = domainResults.flatMap((result) => result.warnings);
  let exams = domainResults.flatMap((result) => result.exams);
  let fallbackDemo = false;

  if (mode === "demo" && exams.length === 0) {
    exams = createDemoRadiologyExams(domains, patient);
    fallbackDemo = true;
    requestStatuses.push({
      id: "demo-radiology-sample-data",
      domainId: "demo",
      domainName: "Demo",
      label: "Radiology sample data",
      path: "local demo rows",
      status: "warning",
      count: exams.length,
      message: "No radiology reports were returned by the demo FHIR server, so sample POC rows are shown.",
    });
    warnings.push("Demo mode is showing sample radiology rows because the selected public FHIR server did not return radiology exam data.");
  }

  return {
    mode,
    serverUrl,
    patientId,
    patient,
    radiology: {
      domains,
      exams,
      requestStatuses,
      fallbackDemo,
    },
    warnings,
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

function getSmartScope() {
  if (import.meta.env.VITE_SMART_SCOPE) {
    return import.meta.env.VITE_SMART_SCOPE;
  }

  const params = new URLSearchParams(window.location.search);
  return params.has("launch") ? SMART_PROVIDER_SCOPE : SMART_PATIENT_SCOPE;
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

function buildRadiologyDomains(client: SmartClient, patientId: string, serverUrl: string): DomainRuntime[] {
  const primaryServerUrl = envOrDefault("VITE_RADIOLOGY_DOMAIN_1_URL", serverUrl);
  const primaryPatientId = envOrDefault("VITE_RADIOLOGY_DOMAIN_1_PATIENT_ID", patientId);
  const secondaryServerUrl = import.meta.env.VITE_RADIOLOGY_DOMAIN_2_URL;
  const secondaryPatientId = envOrDefault("VITE_RADIOLOGY_DOMAIN_2_PATIENT_ID", patientId);

  return [
    {
      id: "domain-1",
      name: envOrDefault("VITE_RADIOLOGY_DOMAIN_1_NAME", "Millennium Domain 1"),
      serverUrl: primaryServerUrl,
      patientId: primaryPatientId,
      configured: true,
      launchDomain: urlsMatch(primaryServerUrl, serverUrl),
      requestWithActiveClient: urlsMatch(primaryServerUrl, serverUrl),
    },
    {
      id: "domain-2",
      name: envOrDefault("VITE_RADIOLOGY_DOMAIN_2_NAME", "Millennium Domain 2"),
      serverUrl: secondaryServerUrl ?? "Configure VITE_RADIOLOGY_DOMAIN_2_URL",
      patientId: secondaryPatientId,
      configured: Boolean(secondaryServerUrl),
      launchDomain: Boolean(secondaryServerUrl && urlsMatch(secondaryServerUrl, client.state?.serverUrl ?? serverUrl)),
      requestWithActiveClient: Boolean(secondaryServerUrl && urlsMatch(secondaryServerUrl, client.state?.serverUrl ?? serverUrl)),
    },
  ];
}

async function loadDomainRadiology(client: SmartClient, domain: DomainRuntime, patient: PatientResource) {
  if (!domain.configured) {
    const status = makeStatus(domain, "Domain configuration", "VITE_RADIOLOGY_DOMAIN_2_URL", "warning", {
      message: "Second Millennium domain is not configured yet.",
    });

    return {
      exams: [] as RadiologyExam[],
      requestStatuses: [status],
      warnings: [`${domain.name}: configure VITE_RADIOLOGY_DOMAIN_2_URL to query the second domain.`],
    };
  }

  const encodedPatientId = encodeURIComponent(domain.patientId);
  const [patientResult, encounterResult, diagnosticReportResult, serviceRequestResult] = await Promise.all([
    safeDomainResources<PatientResource>(client, domain, `/Patient/${encodedPatientId}`, "Patient"),
    safeDomainResources(client, domain, `/Encounter?patient=${encodedPatientId}&_count=20`, "Encounter"),
    safeDomainResources<DiagnosticReportResource>(client, domain, `/DiagnosticReport?patient=${encodedPatientId}&_count=30`, "DiagnosticReport"),
    safeDomainResources<ServiceRequestResource>(client, domain, `/ServiceRequest?patient=${encodedPatientId}&_count=30`, "ServiceRequest"),
  ]);

  const exams = buildRadiologyExams(domain, patient, diagnosticReportResult.resources, serviceRequestResult.resources);
  const examInfoStatuses = await hydrateExamInfo(client, domain, exams);
  const requestStatuses = [
    patientResult.status,
    encounterResult.status,
    diagnosticReportResult.status,
    serviceRequestResult.status,
    ...examInfoStatuses,
  ];
  const warnings = requestStatuses
    .filter((status) => status.status !== "succeeded")
    .map((status) => `${status.domainName} ${status.label}: ${status.message ?? "request did not fully succeed"}`);

  return {
    exams,
    requestStatuses,
    warnings,
  };
}

async function safeDomainResources<T extends FhirResource>(
  client: SmartClient,
  domain: DomainRuntime,
  path: string,
  label: string,
): Promise<ResourceRequestResult<T>> {
  try {
    const value = await requestDomain<Bundle<T> | T[] | T>(client, domain, path);
    const resources = resourcesFromBundle<T>(value);

    return {
      resources,
      status: makeStatus(domain, label, path, "succeeded", { count: resources.length }),
    };
  } catch (error) {
    return {
      resources: [],
      status: makeStatus(domain, label, path, "failed", { message: errorMessage(error) }),
    };
  }
}

async function safeDomainValue<T>(client: SmartClient, domain: DomainRuntime, path: string, label: string): Promise<ValueRequestResult<T>> {
  try {
    const value = await requestDomain<T>(client, domain, path);

    return {
      value,
      status: makeStatus(domain, label, path, "succeeded", { count: 1 }),
    };
  } catch (error) {
    return {
      value: null,
      status: makeStatus(domain, label, path, "warning", { message: errorMessage(error) }),
    };
  }
}

async function requestDomain<T>(client: SmartClient, domain: DomainRuntime, path: string): Promise<T> {
  if (domain.requestWithActiveClient) {
    return client.request<T>(path);
  }

  const headers: Record<string, string> = {
    Accept: "application/fhir+json, application/json",
  };
  const accessToken = client.state?.tokenResponse?.access_token;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(toFhirUrl(domain.serverUrl, path), { headers });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function buildRadiologyExams(
  domain: RadiologyDomain,
  patient: PatientResource,
  diagnosticReports: DiagnosticReportResource[],
  serviceRequests: ServiceRequestResource[],
) {
  const patientDisplayName = patientName(patient);
  const serviceRequestById = new Map(serviceRequests.filter((request) => request.id).map((request) => [request.id as string, request]));
  const radiologyReports = diagnosticReports.filter(isRadiologyReport);
  const radiologyRequests = serviceRequests.filter(isRadiologyServiceRequest);
  const usedServiceRequestIds = new Set<string>();
  const exams = radiologyReports.map((report, index) => {
    const serviceRequestId = report.basedOn?.map(referenceId).find((id) => id && serviceRequestById.has(id));
    const serviceRequest = serviceRequestId ? serviceRequestById.get(serviceRequestId) : undefined;

    if (serviceRequest?.id) {
      usedServiceRequestIds.add(serviceRequest.id);
    }

    return createRadiologyExam(domain, patientDisplayName, report, serviceRequest, index);
  });

  radiologyRequests.forEach((serviceRequest, index) => {
    if (serviceRequest.id && usedServiceRequestIds.has(serviceRequest.id)) {
      return;
    }

    exams.push(createRadiologyExam(domain, patientDisplayName, undefined, serviceRequest, radiologyReports.length + index));
  });

  return exams;
}

function createRadiologyExam(
  domain: RadiologyDomain,
  patientDisplayName: string,
  report: DiagnosticReportResource | undefined,
  serviceRequest: ServiceRequestResource | undefined,
  index: number,
): RadiologyExam {
  const orderId = serviceRequest?.id ?? report?.basedOn?.map(referenceId).find(Boolean) ?? report?.id;
  const reportUrl = report ? reportUrlFromDiagnosticReport(report, domain.serverUrl) : undefined;
  const reportAvailable = Boolean(report);
  const orderName = codeText(report?.code) || codeText(serviceRequest?.code) || "Radiology exam";
  const modality = modalityFromConcept(report?.code) || modalityFromConcept(serviceRequest?.code) || "Radiology";
  const accessionNumber = accessionFromIdentifiers(report?.identifier) ?? accessionFromIdentifiers(serviceRequest?.identifier);

  return {
    id: `${domain.id}-${report?.id ?? serviceRequest?.id ?? index}`,
    domainId: domain.id,
    domainName: domain.name,
    patientId: domain.patientId,
    patientName: patientDisplayName,
    examDate: report?.effectiveDateTime ?? report?.issued ?? serviceRequest?.occurrenceDateTime ?? serviceRequest?.authoredOn ?? "Date unavailable",
    orderName,
    modality,
    status: report?.status ?? serviceRequest?.status ?? "unknown",
    diagnosticReportId: report?.id,
    serviceRequestId: serviceRequest?.id,
    orderId,
    accessionNumber,
    reportUrl,
    reportLabel: reportAvailable ? (reportUrl ? "PDF ready" : "Report found") : "No report",
    reportAvailable,
    imageLabel: "Exam info pending",
    imageAvailable: false,
    warnings: [],
  };
}

async function hydrateExamInfo(client: SmartClient, domain: DomainRuntime, exams: RadiologyExam[]) {
  const statuses: ApiRequestStatus[] = [];

  for (const exam of exams.slice(0, MAX_EXAM_INFO_REQUESTS)) {
    if (!exam.orderId) {
      exam.imageLabel = "Order ID missing";
      exam.warnings.push("Cannot call exam-info because the order ID was not available.");
      continue;
    }

    const path = `/radiology-orders/${encodeURIComponent(exam.orderId)}/exam-info`;
    const result = await safeDomainValue<Record<string, unknown>>(client, domain, path, "Exam info");
    statuses.push(result.status);

    if (!result.value) {
      exam.imageLabel = "Image not confirmed";
      exam.warnings.push(result.status.message ?? "Exam-info request did not return a study ID.");
      continue;
    }

    const studyId = firstStringByKeys(result.value, ["studyId", "studyID", "study_id", "studyInstanceUid", "studyInstanceUID", "studyUid"]);
    const imageViewerUrl = firstStringByKeys(result.value, ["viewerUrl", "imageViewerUrl", "launchUrl", "url"]);
    const accessionNumber = firstStringByKeys(result.value, ["accession", "accessionNumber", "accession_number"]);

    exam.studyId = studyId;
    exam.imageViewerUrl = imageViewerUrl ?? buildViewerUrl(studyId, exam.orderId, client.state?.tokenResponse?.access_token);
    exam.accessionNumber = exam.accessionNumber ?? accessionNumber;
    exam.imageAvailable = Boolean(studyId || exam.imageViewerUrl);
    exam.imageLabel = exam.imageAvailable ? "Study ready" : "No study ID";
  }

  return statuses;
}

function createDemoRadiologyExams(domains: RadiologyDomain[], patient: PatientResource): RadiologyExam[] {
  const [domainOne, domainTwo] = domains;
  const displayName = patientName(patient);

  return [
    {
      id: "demo-domain-1-ct-chest",
      domainId: domainOne.id,
      domainName: domainOne.name,
      patientId: domainOne.patientId,
      patientName: displayName,
      examDate: "2026-06-10",
      orderName: "CT Chest W Contrast",
      modality: "CT",
      status: "final",
      diagnosticReportId: "demo-report-ct-chest",
      serviceRequestId: "demo-order-ct-chest",
      orderId: "demo-order-ct-chest",
      accessionNumber: "ACC-100245",
      reportLabel: "PDF ready",
      reportAvailable: true,
      studyId: "1.2.840.113619.2.55.3.demo.ct",
      imageLabel: "Study ready",
      imageAvailable: true,
      warnings: [],
    },
    {
      id: "demo-domain-2-xray-abdomen",
      domainId: domainTwo.id,
      domainName: domainTwo.name,
      patientId: domainTwo.patientId,
      patientName: displayName,
      examDate: "2026-05-28",
      orderName: "X-Ray Abdomen 2 Views",
      modality: "XR",
      status: "final",
      diagnosticReportId: "demo-report-xray-abdomen",
      serviceRequestId: "demo-order-xray-abdomen",
      orderId: "demo-order-xray-abdomen",
      accessionNumber: "ACC-208451",
      reportLabel: "PDF ready",
      reportAvailable: true,
      studyId: "1.2.840.113619.2.55.3.demo.xr",
      imageLabel: "Study ready",
      imageAvailable: true,
      warnings: [],
    },
    {
      id: "demo-domain-1-mri-brain",
      domainId: domainOne.id,
      domainName: domainOne.name,
      patientId: domainOne.patientId,
      patientName: displayName,
      examDate: "2026-04-12",
      orderName: "MRI Brain Without Contrast",
      modality: "MR",
      status: "preliminary",
      diagnosticReportId: "demo-report-mri-brain",
      serviceRequestId: "demo-order-mri-brain",
      orderId: "demo-order-mri-brain",
      accessionNumber: "ACC-665390",
      reportLabel: "Report found",
      reportAvailable: true,
      imageLabel: "Image not confirmed",
      imageAvailable: false,
      warnings: ["Image viewer launch is unavailable because exam-info did not return a study ID."],
    },
    {
      id: "demo-domain-2-ultrasound",
      domainId: domainTwo.id,
      domainName: domainTwo.name,
      patientId: domainTwo.patientId,
      patientName: displayName,
      examDate: "2026-03-02",
      orderName: "Ultrasound Abdomen Complete",
      modality: "US",
      status: "ordered",
      serviceRequestId: "demo-order-ultrasound",
      orderId: "demo-order-ultrasound",
      accessionNumber: "ACC-449120",
      reportLabel: "No report",
      reportAvailable: false,
      imageLabel: "No image",
      imageAvailable: false,
      warnings: ["Report and image are intentionally absent to validate missing-state behavior."],
    },
  ];
}

function reportUrlFromDiagnosticReport(report: DiagnosticReportResource, serverUrl: string) {
  const attachment =
    report.presentedForm?.find((form) => form.contentType?.toLowerCase().includes("pdf")) ?? report.presentedForm?.find((form) => form.url || form.data);

  if (!attachment) {
    return undefined;
  }

  if (attachment.data) {
    return `data:${attachment.contentType ?? "application/pdf"};base64,${attachment.data}`;
  }

  if (!attachment.url) {
    return undefined;
  }

  return toFhirUrl(serverUrl, attachment.url);
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

function isRadiologyReport(report: DiagnosticReportResource) {
  return [report.code, ...(report.category ?? [])].some(isRadiologyConcept);
}

function isRadiologyServiceRequest(request: ServiceRequestResource) {
  return [request.code, ...(request.category ?? [])].some(isRadiologyConcept);
}

function isRadiologyConcept(concept?: CodeableConcept) {
  const values = [concept?.text, ...(concept?.coding ?? []).flatMap((coding) => [coding.code, coding.display])].filter(Boolean).join(" ").toLowerCase();

  return ["rad", "radiology", "x-ray", "xray", "ct", "mri", "mr ", "ultrasound", "imaging"].some((term) => values.includes(term));
}

function codeText(concept?: CodeableConcept) {
  return concept?.text ?? concept?.coding?.find((coding) => coding.display)?.display ?? concept?.coding?.[0]?.code ?? "";
}

function modalityFromConcept(concept?: CodeableConcept) {
  const value = [concept?.text, ...(concept?.coding ?? []).flatMap((coding) => [coding.code, coding.display])].filter(Boolean).join(" ").toLowerCase();

  if (value.includes("ct")) {
    return "CT";
  }

  if (value.includes("mri") || value.includes("mr ")) {
    return "MR";
  }

  if (value.includes("x-ray") || value.includes("xray")) {
    return "XR";
  }

  if (value.includes("ultrasound") || value.includes("us ")) {
    return "US";
  }

  return "";
}

function accessionFromIdentifiers(identifiers?: Array<{ value?: string }>) {
  return identifiers?.find((identifier) => identifier.value)?.value;
}

function referenceId(reference?: Reference) {
  const value = reference?.reference;

  if (!value) {
    return undefined;
  }

  return value.split("/").filter(Boolean).at(-1);
}

function patientName(patient?: PatientResource | null) {
  const name = patient?.name?.find((item) => item.use === "official") ?? patient?.name?.[0];

  if (!name) {
    return "Unknown patient";
  }

  return name.text ?? ([...(name.given ?? []), name.family].filter(Boolean).join(" ") || "Unknown patient");
}

function firstStringByKeys(value: unknown, keys: string[], depth = 0): string | undefined {
  if (!value || depth > 4) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstStringByKeys(item, keys, depth + 1);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  if (typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const match = record[key];

    if (typeof match === "string" && match.trim()) {
      return match;
    }
  }

  for (const nested of Object.values(record)) {
    const found = firstStringByKeys(nested, keys, depth + 1);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function buildViewerUrl(studyId?: string, orderId?: string, accessToken?: string) {
  const template = import.meta.env.VITE_IMAGE_VIEWER_URL_TEMPLATE;

  if (!template || (!studyId && !orderId)) {
    return undefined;
  }

  return template
    .replaceAll("{studyId}", encodeURIComponent(studyId ?? ""))
    .replaceAll("{orderId}", encodeURIComponent(orderId ?? ""))
    .replaceAll("{accessToken}", encodeURIComponent(accessToken ?? ""));
}

function toFhirUrl(serverUrl: string, path: string) {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  return `${serverUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function makeStatus(
  domain: RadiologyDomain,
  label: string,
  path: string,
  status: ApiRequestStatus["status"],
  extras: Pick<ApiRequestStatus, "count" | "message"> = {},
): ApiRequestStatus {
  return {
    id: `${domain.id}-${label}-${path}`.replace(/\W+/g, "-"),
    domainId: domain.id,
    domainName: domain.name,
    label,
    path,
    status,
    ...extras,
  };
}

function envOrDefault(key: string, fallback: string) {
  return String(import.meta.env[key] ?? fallback);
}

function urlsMatch(left: string, right: string) {
  return left.replace(/\/$/, "") === right.replace(/\/$/, "");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown FHIR request error";
}
