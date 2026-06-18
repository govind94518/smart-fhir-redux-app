import type { CodeableConcept, FhirPrimitive, FhirResource, HumanName, PatientResource, Reference } from "../../types/fhir";

export function patientName(patient?: PatientResource | null) {
  const name = patient?.name?.find((item) => item.use === "official") ?? patient?.name?.[0];
  return formatHumanName(name) || "Unknown patient";
}

export function patientAge(patient?: PatientResource | null) {
  if (!patient?.birthDate) {
    return "Age unavailable";
  }

  const birthDate = new Date(patient.birthDate);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} years`;
}

export function formatHumanName(name?: HumanName) {
  if (!name) {
    return "";
  }

  if (name.text) {
    return name.text;
  }

  return [...(name.given ?? []), name.family].filter(Boolean).join(" ");
}

export function codeText(value: unknown) {
  const concept = value as CodeableConcept | undefined;
  return concept?.text ?? concept?.coding?.find((coding) => coding.display)?.display ?? concept?.coding?.[0]?.code ?? "Not specified";
}

export function referenceText(value: unknown) {
  const reference = value as Reference | undefined;
  return reference?.display ?? reference?.reference ?? "Not specified";
}

export function resourceTitle(resource: FhirResource) {
  if (resource.resourceType === "MedicationRequest") {
    return codeText(resource.medicationCodeableConcept) || referenceText(resource.medicationReference);
  }

  if (resource.resourceType === "Observation") {
    return codeText(resource.code);
  }

  if (resource.resourceType === "Condition") {
    return codeText(resource.code);
  }

  if (resource.resourceType === "Encounter") {
    return codeText(resource.type);
  }

  return resource.resourceType;
}

export function resourceMeta(resource: FhirResource) {
  if (resource.resourceType === "MedicationRequest") {
    return [primitive(resource.status), primitive(resource.intent)].filter(Boolean).join(" / ");
  }

  if (resource.resourceType === "Observation") {
    return [primitive(resource.effectiveDateTime), valueQuantity(resource.valueQuantity)].filter(Boolean).join(" / ");
  }

  if (resource.resourceType === "Condition") {
    return [codeText(resource.clinicalStatus), primitive(resource.recordedDate)].filter(Boolean).join(" / ");
  }

  if (resource.resourceType === "Encounter") {
    return [primitive(resource.status), primitive((resource.period as { start?: string } | undefined)?.start)].filter(Boolean).join(" / ");
  }

  return resource.id ?? "";
}

export function valueQuantity(value: unknown) {
  const quantity = value as { value?: FhirPrimitive; unit?: string; code?: string } | undefined;
  if (quantity?.value === undefined || quantity.value === null) {
    return "";
  }

  return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ""}`;
}

function primitive(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}
