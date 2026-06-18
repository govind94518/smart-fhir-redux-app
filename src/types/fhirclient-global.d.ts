interface SmartAuthorizeConfig {
  clientId: string;
  scope: string;
  redirectUri: string;
}

interface SmartFhirGlobal {
  client: (baseUrl: string) => unknown;
  oauth2: {
    authorize: (config: SmartAuthorizeConfig) => void;
    ready: () => Promise<unknown>;
    logout?: () => Promise<void>;
  };
}

interface Window {
  FHIR?: SmartFhirGlobal;
}
