'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseClient, isFirebaseConfigured } from './client';

export function useRadarSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configurationError, setConfigurationError] = useState('');
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setConfigurationError('A configuração NEXT_PUBLIC_FIREBASE_* não está completa neste ambiente.');
      setLoading(false);
      return;
    }
    try {
      return onAuthStateChanged(getFirebaseClient().auth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      }, () => {
        setConfigurationError('Não foi possível iniciar a sessão do Firebase Authentication.');
        setLoading(false);
      });
    } catch {
      setConfigurationError('Não foi possível iniciar o Firebase. Confira a configuração do projeto.');
      setLoading(false);
    }
  }, []);
  return { user, loading, configurationError };
}

