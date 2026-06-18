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

export interface ClinicalSummary {
  mode: "smart" | "demo";
  serverUrl: string;
  patientId: string;
  patient: PatientResource;
  cernerTutorial: CernerTutorialSummary;
  medications: FhirResource[];
  observations: ObservationResource[];
  conditions: FhirResource[];
  encounters: FhirResource[];
  warnings: string[];
}
