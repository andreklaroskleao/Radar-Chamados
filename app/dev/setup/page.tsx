import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { inspectFirebaseClientConfig } from '@/lib/firebase/diagnostics';
import { SetupDashboard } from './setup-dashboard';

export const dynamic = 'force-dynamic';

export default async function DevelopmentSetupPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const requestHeaders = await headers();
  const currentHost = requestHeaders.get('host') ?? 'Host não identificado';
  const config = inspectFirebaseClientConfig({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  });

  return <SetupDashboard config={config} currentHost={currentHost} />;
}
