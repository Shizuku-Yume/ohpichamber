const asText = (value) => typeof value === 'string' && value.trim() ? value : null;
export const credentialAccessToken = (credential) => {
  if (!credential || typeof credential !== 'object') return null;
  if (credential.type === 'api_key') return asText(credential.key);
  if (credential.type === 'oauth') return asText(credential.access);
  return null;
};
export const credentialRefreshToken = (credential) => credential?.type === 'oauth' ? asText(credential.refresh) : null;
export const credentialExpiresAt = (credential) => credential?.type === 'oauth' && Number.isFinite(credential.expires) ? credential.expires : null;
/**
 * A missing credential record is a configuration state, not a provider
 * failure. Host credential resolution uses the same code for "no record".
 * Every other resolution failure is a real error and keeps the provider
 * configured, so callers do not show a connection as unconfigured.
 */
export const SELECTED_CREDENTIAL_UNAVAILABLE = 'CREDENTIAL_UNAVAILABLE';
/** The caller did not supply the ownership context the resolver needs. */
export const SELECTED_CREDENTIAL_CONTEXT_REQUIRED = 'CREDENTIAL_CONTEXT_REQUIRED';
const SELECTED_CREDENTIAL_RESOLUTION_FAILED = 'CREDENTIAL_RESOLUTION_FAILED';
const credentialResolutionError = (code, message) => Object.assign(new Error(message), { code });

export const requireSelectedCredential = async ({ resolveCredential, workspaceId, agentDirectoryId, providerId, credentialRef, purpose }) => {
  if (typeof resolveCredential !== 'function') throw credentialResolutionError(SELECTED_CREDENTIAL_CONTEXT_REQUIRED, 'Selected credential context is required');
  if (![workspaceId, agentDirectoryId, providerId, credentialRef, purpose].every((value) => typeof value === 'string' && value.trim())) throw credentialResolutionError(SELECTED_CREDENTIAL_CONTEXT_REQUIRED, 'Selected credential context is required');
  try {
    const credential = await resolveCredential({ workspaceId, agentDirectoryId, providerId, credentialRef, purpose });
    if (!credentialAccessToken(credential)) throw credentialResolutionError(SELECTED_CREDENTIAL_UNAVAILABLE, 'Selected credential unavailable');
    return credential;
  } catch (error) {
    throw error?.code === SELECTED_CREDENTIAL_UNAVAILABLE
      ? credentialResolutionError(SELECTED_CREDENTIAL_UNAVAILABLE, 'Selected credential unavailable')
      : credentialResolutionError(SELECTED_CREDENTIAL_RESOLUTION_FAILED, 'Selected credential unavailable');
  }
};
