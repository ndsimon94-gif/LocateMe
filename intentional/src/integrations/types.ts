/**
 * Integration status is explicit and honest: an integration is only
 * `connected` after a real OAuth flow succeeds (not implemented in this
 * milestone). Mock providers always report `not_connected` and `isMock: true`.
 */
export type IntegrationId = 'google_calendar' | 'gmail';

export type ConnectionStatus = 'not_connected' | 'connecting' | 'connected' | 'error';

export interface IntegrationInfo {
  id: IntegrationId;
  displayName: string;
  status: ConnectionStatus;
  /** True when the provider is serving generated sample data. */
  isMock: boolean;
}

export class IntegrationNotAuthorizedError extends Error {
  constructor(public readonly integration: IntegrationId) {
    super(`${integration} is not connected. No external action was taken.`);
    this.name = 'IntegrationNotAuthorizedError';
  }
}
