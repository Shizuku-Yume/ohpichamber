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
export const SELECTED_CREDENTIAL_RESOLUTION_FAILED = 'CREDENTIAL_RESOLUTION_FAILED';
const credentialResolutionError = (code) => Object.assign(new Error('Selected credential unavailable'), { code });

export const requireSelectedCredential = async ({ resolveCredential, workspaceId, agentDirectoryId, providerId, credentialRef, purpose }) => {
  if (typeof resolveCredential !== 'function') throw credentialResolutionError(SELECTED_CREDENTIAL_RESOLUTION_FAILED);
  if (![workspaceId, agentDirectoryId, providerId, credentialRef, purpose].every((value) => typeof value === 'string' && value.trim())) throw credentialResolutionError(SELECTED_CREDENTIAL_RESOLUTION_FAILED);
  try {
    const credential = await resolveCredential({ workspaceId, agentDirectoryId, providerId, credentialRef, purpose });
    if (!credentialAccessToken(credential)) throw credentialResolutionError(SELECTED_CREDENTIAL_UNAVAILABLE);
    return credential;
  } catch (error) {
    throw credentialResolutionError(error?.code === SELECTED_CREDENTIAL_UNAVAILABLE
      ? SELECTED_CREDENTIAL_UNAVAILABLE
      : SELECTED_CREDENTIAL_RESOLUTION_FAILED);
  }
};
