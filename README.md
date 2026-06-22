# SMART Patient Summary

React + Redux Toolkit SMART on FHIR starter app.

## Purpose

This app demonstrates the basic SMART on FHIR flow used by the Cerner SMART tutorial:

1. An EHR or SMART launcher opens `/launch` with `iss` and `launch` parameters.
2. The app starts SMART OAuth authorization.
3. The EHR redirects back to `/`.
4. The app receives patient context and calls FHIR APIs.
5. Redux stores plain clinical resources.
6. React renders the patient dashboard.

Demo mode uses the public SMART R4 FHIR server and native `fetch`.
Real SMART launch uses the browser SMART JavaScript client loaded in `index.html`.
The main tutorial panel mirrors the Cerner sample by displaying Patient demographics
and selected Observation values: height, systolic blood pressure, diastolic blood
pressure, LDL, and HDL.

## Scripts

```bash
npm run dev
npm run build
npm run build:pages
npm run preview
```

This local workspace also has:

```bash
npm run install:cache
```

That command installs dependencies from this machine's npm cache when registry access is blocked.

## Key Files

- `src/services/smartClient.ts`: SMART launch, demo FHIR client, clinical data loading.
- `src/features/clinical/clinicalSlice.ts`: Redux Toolkit async thunks and state.
- `src/pages/DashboardPage.tsx`: Main app dashboard.
- `src/pages/LaunchPage.tsx`: SMART launch route.
- `src/components/ClinicalFlow.tsx`: Data-flow visualization.

## GitHub Pages

For the Cerner standalone patient tutorial flow, register the app with a public
GitHub Pages redirect URL:

```text
https://<github-username>.github.io/smart-fhir-redux-app/
```

Build the GitHub Pages artifact with:

```bash
npm run build:pages
```

This uses `/smart-fhir-redux-app/` as the Vite base path and creates `dist/404.html`
so direct routes like `/smart-fhir-redux-app/launch?iss=...` work on GitHub Pages.

If your repository name is different, update the `--base=/smart-fhir-redux-app/`
value in `package.json`.

## SMART Launcher

Use this launch URL in the SMART sandbox:

```text
https://<github-username>.github.io/smart-fhir-redux-app/launch
```

The app auto-selects scopes based on launch type:

- Provider EHR Launch URLs include `iss` and `launch`, so the app requests `launch`.
- Patient Standalone Launch URLs include only `iss`, so the app requests `launch/patient`.

## Radiology POC Flow

The dashboard is shaped around the 6-week SMART radiology POC:

1. Launch from PowerChart or SMART Launcher.
2. Resolve the launch patient.
3. Query each configured Millennium domain.
4. Load `/Patient`, `/Encounter`, `/DiagnosticReport`, `/ServiceRequest`, and `/radiology-orders/{orderId}/exam-info`.
5. Merge radiology exams into one cross-domain table.
6. Open report links from `DiagnosticReport.presentedForm`.
7. Launch the image viewer when exam-info returns a study ID or viewer URL.

Configure a second domain in `.env` when real cross-domain access is available:

```text
VITE_RADIOLOGY_DOMAIN_2_NAME=Millennium Domain 2
VITE_RADIOLOGY_DOMAIN_2_URL=https://domain-two.example.com/fhir
VITE_RADIOLOGY_DOMAIN_2_PATIENT_ID=domain-two-patient-id
VITE_IMAGE_VIEWER_URL_TEMPLATE=https://viewer.example.com/launch?studyId={studyId}&orderId={orderId}
```

Demo mode falls back to local sample radiology rows only when the public demo FHIR server returns no radiology exams.
