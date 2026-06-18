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
