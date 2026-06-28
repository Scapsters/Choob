import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';
import type { AccessContext } from '@bity/oauth2-auth-code-pkce';


export const lichessHost = 'https://lichess.org';
export const scopes = ['study:read'];
export const clientId = 'choob.com';
export const authToken = $state({
	token: ''
});

export class Login {
  redirectUrl: string;
  oauth: OAuth2AuthCodePKCE;
  error?: unknown;
  accessContext?: AccessContext;

  constructor(redirectUrl: string) {
    this.redirectUrl = redirectUrl;
    this.oauth = new OAuth2AuthCodePKCE({
      authorizationUrl: `${lichessHost}/oauth`,
      tokenUrl: `${lichessHost}/api/token`,
      clientId,
      scopes,
      redirectUrl: this.redirectUrl,
      onAccessTokenExpiry: refreshAccessToken => refreshAccessToken(),
      onInvalidGrant: _retry => {
        this.error = new Error('Invalid Grant!')
      },
    });
  }

  async login() {
    // Redirect to authentication prompt.
    await this.oauth.fetchAuthorizationCode();
  }

  async init() {
    try {
      const hasAuthCode = await this.oauth.isReturningFromAuthServer();
      if (hasAuthCode) {
        // Might want to persist accessContext.token until the user logs out.
        this.accessContext = await this.oauth.getAccessToken();

        authToken.token = this.accessContext.token?.value || ''

        // Can also use this convenience wrapper for fetch() instead of
        // using manually using getAccessToken() and setting the
        // "Authorization: Bearer ..." header.
        const fetch = this.oauth.decorateFetchHTTPClient(window.fetch);
      }
    } catch (err) {
      this.error = err;
    }
  }

  async logout() {
    const token = this.accessContext?.token?.value;
    this.accessContext = undefined;
    this.error = undefined;

    // Example request using vanilla fetch: Revoke access token.
    await fetch(`${lichessHost}/api/token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
