export const EXPECTED_FIREBASE_PROJECT_ID = 'radarcomercial2705';

export type FirebasePublicConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export type ClientConfigDiagnostic = {
  state: 'ready' | 'incomplete' | 'wrong-project';
  configuredProjectId: string | null;
  missingVariables: string[];
};

const requiredVariables: Array<[keyof FirebasePublicConfig, string]> = [
  ['apiKey', 'NEXT_PUBLIC_FIREBASE_API_KEY'],
  ['authDomain', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'NEXT_PUBLIC_FIREBASE_APP_ID']
];

export function inspectFirebaseClientConfig(config: FirebasePublicConfig): ClientConfigDiagnostic {
  const missingVariables = requiredVariables
    .filter(([key]) => !config[key]?.trim())
    .map(([, variableName]) => variableName);

  if (config.projectId && config.projectId !== EXPECTED_FIREBASE_PROJECT_ID) {
    return {
      state: 'wrong-project',
      configuredProjectId: config.projectId,
      missingVariables
    };
  }

  return {
    state: missingVariables.length > 0 ? 'incomplete' : 'ready',
    configuredProjectId: config.projectId?.trim() || null,
    missingVariables
  };
}
