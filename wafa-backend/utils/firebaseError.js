const getFirebaseErrorText = (error) => [
  error?.code,
  error?.message,
  error?.errorInfo?.code,
  error?.errorInfo?.message,
].filter(Boolean).join(' ').toLowerCase();

export const classifyFirebaseAdminError = (error) => {
  const errorText = getFirebaseErrorText(error);

  if (
    errorText.includes('invalid jwt signature') ||
    errorText.includes('certificate key file has been revoked') ||
    errorText.includes('invalid private key')
  ) {
    return {
      type: 'credentials',
      detail: 'The Firebase service-account credential is invalid, revoked, or no longer active.',
      solution: 'Generate a new Firebase Admin service-account key, replace the server-side credential, and restart the backend.',
    };
  }

  if (
    errorText.includes('token must be a short-lived token') ||
    errorText.includes('token used too early') ||
    errorText.includes('issued-at') ||
    errorText.includes('clock skew')
  ) {
    return {
      type: 'clock',
      detail: 'The server clock is outside Firebase authentication tolerance.',
      solution: 'Synchronize the host clock with NTP, verify the container time, and retry.',
    };
  }

  return {
    type: 'configuration',
    detail: 'Firebase Admin authentication is unavailable.',
    solution: 'Verify the Firebase project ID, client email, private key formatting, and service-account permissions.',
  };
};

