export function firebaseErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return String((error as { code?: unknown }).code || '');
}

export function firebaseOperationError(error: unknown, fallback: string): string {
  const code = firebaseErrorCode(error);
  if (code === 'permission-denied') return `${fallback} O Firestore recusou a operação (permission-denied).`;
  if (code === 'unavailable' || code === 'deadline-exceeded') return `${fallback} O Firestore não respondeu (${code}); confira a conexão e tente novamente.`;
  if (code === 'failed-precondition') return `${fallback} O Firestore informou uma condição não atendida (failed-precondition).`;
  if (code) return `${fallback} Código Firebase: ${code}.`;
  return fallback;
}
