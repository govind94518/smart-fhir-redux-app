import type { CernerTutorialSummary, CodeableConcept, ObservationResource, PatientResource, Quantity } from "../types/fhir";

const CODES = {
  height: "8302-2",
  systolicBp: "8480-6",
  diastolicBp: "8462-4",
  hdl: "2085-9",
  ldl: "2089-1",
} as const;

export const CERNER_TUTORIAL_OBSERVATION_CODES = [
  "http://loinc.org|8302-2",
  "http://loinc.org|8462-4",
  "http://loinc.org|8480-6",
  "http://loinc.org|2085-9",
  "http://loinc.org|2089-1",
  "http://loinc.org|55284-4",
].join(",");

export function buildCernerTutorialSummary(patient: PatientResource, observations: ObservationResource[]): CernerTutorialSummary {
  const name = patient.name?.[0];

  return {
    firstName: name?.given?.join(" ") || "Unavailable",
    lastName: name?.family || "Unavailable",
    gender: patient.gender || "Unavailable",
    birthDate: formatDate(patient.birthDate),
    age: patient.birthDate ? String(calculateAge(patient.birthDate)) : "Unavailable",
    height: observationValue(observations, CODES.height),
    systolicBp: observationValue(observations, CODES.systolicBp),
    diastolicBp: observationValue(observations, CODES.diastolicBp),
    ldl: observationValue(observations, CODES.ldl),
    hdl: observationValue(observations, CODES.hdl),
  };
}

function observationValue(observations: ObservationResource[], code: string) {
  for (const observation of observations) {
    if (conceptHasCode(observation.code, code)) {
      const value = quantityText(observation.valueQuantity);
      if (value) {
        return value;
      }
    }

    const component = observation.component?.find((item) => conceptHasCode(item.code, code));
    const componentValue = quantityText(component?.valueQuantity);
    if (componentValue) {
      return componentValue;
    }
  }

  return "Not returned";
}

function conceptHasCode(concept: CodeableConcept | undefined, code: string) {
  return concept?.coding?.some((coding) => coding.code === code) ?? false;
}

function quantityText(quantity: Quantity | undefined) {
  if (quantity?.value === undefined) {
    return "";
  }

  return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ""}`;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function calculateAge(value: string) {
  const birthDate = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}
