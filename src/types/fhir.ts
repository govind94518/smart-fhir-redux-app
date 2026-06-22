export type FhirPrimitive = string | number | boolean | null | undefined;

export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export interface HumanName {
  given?: string[];
  family?: string;
  text?: string;
  use?: string;
}

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface CodeableConcept {
  text?: string;
  coding?: Coding[];
}

export interface Reference {
  reference?: string;
  display?: string;
}

export interface PatientResource extends FhirResource {
  resourceType: "Patient";
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system?: string; value?: string; use?: string }>;
  address?: Array<{ line?: string[]; city?: string; state?: string; postalCode?: string }>;
}

export interface Quantity {
  value?: number;
  unit?: string;
  code?: string;
  system?: string;
}

export interface ObservationComponent {
  code?: CodeableConcept;
  valueQuantity?: Quantity;
}

export interface ObservationResource extends FhirResource {
  resourceType: "Observation";
  code?: CodeableConcept;
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  component?: ObservationComponent[];
}

export interface Attachment {
  contentType?: string;
  data?: string;
  url?: string;
  title?: string;
}

export interface Identifier {
  system?: string;
  value?: string;
  type?: CodeableConcept;
}

export interface Period {
  start?: string;
  end?: string;
}

export interface DiagnosticReportResource extends FhirResource {
  resourceType: "DiagnosticReport";
  status?: string;
  category?: CodeableConcept[];
  code?: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  issued?: string;
  basedOn?: Reference[];
  identifier?: Identifier[];
  presentedForm?: Attachment[];
  media?: Array<{
    comment?: string;
    link?: Reference;
  }>;
}

export interface ServiceRequestResource extends FhirResource {
  resourceType: "ServiceRequest";
  status?: string;
  intent?: string;
  category?: CodeableConcept[];
  code?: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  authoredOn?: string;
  occurrenceDateTime?: string;
  identifier?: Identifier[];
  basedOn?: Reference[];
  requisition?: Identifier;
}

export interface EncounterResource extends FhirResource {
  resourceType: "Encounter";
  status?: string;
  type?: CodeableConcept[];
  period?: Period;
}

export interface Bundle<T extends FhirResource = FhirResource> {
  resourceType: "Bundle";
  entry?: Array<{
    fullUrl?: string;
    resource?: T;
  }>;
  total?: number;
}

export interface CernerTutorialSummary {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  age: string;
  height: string;
  systolicBp: string;
  diastolicBp: string;
  ldl: string;
  hdl: string;
}

export type RequestStatus = "succeeded" | "warning" | "failed";

export interface ApiRequestStatus {
  id: string;
  domainId: string;
  domainName: string;
  label: string;
  path: string;
  status: RequestStatus;
  count?: number;
  message?: string;
}

export interface RadiologyDomain {
  id: string;
  name: string;
  serverUrl: string;
  patientId: string;
  configured: boolean;
  launchDomain: boolean;
}

export interface RadiologyExam {
  id: string;
  domainId: string;
  domainName: string;
  patientId: string;
  patientName: string;
  examDate: string;
  orderName: string;
  modality: string;
  status: string;
  diagnosticReportId?: string;
  serviceRequestId?: string;
  orderId?: string;
  accessionNumber?: string;
  reportUrl?: string;
  reportLabel: string;
  reportAvailable: boolean;
  studyId?: string;
  imageViewerUrl?: string;
  imageLabel: string;
  imageAvailable: boolean;
  warnings: string[];
}

export interface RadiologySummary {
  domains: RadiologyDomain[];
  exams: RadiologyExam[];
  requestStatuses: ApiRequestStatus[];
  fallbackDemo: boolean;
}

export interface ClinicalSummary {
  mode: "smart" | "demo";
  serverUrl: string;
  patientId: string;
  patient: PatientResource;
  radiology: RadiologySummary;
  warnings: string[];
}
