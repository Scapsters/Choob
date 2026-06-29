import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';
import type { AccessContext, AccessToken } from '@bity/oauth2-auth-code-pkce';
import { SvelteDate } from 'svelte/reactivity';

export const lichessHost = 'https://lichess.org';
export const scopes = ['study:read'];
export const clientId = 'choob.com';
export let authToken = $state<{ token: AccessToken | null }>({ token: null });


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
			onAccessTokenExpiry: (refreshAccessToken) => refreshAccessToken(),
			onInvalidGrant: (_retry) => {
				this.error = new Error('Invalid Grant!');
			}
		});
	}

	async login() {
		// check cache
		const JSONifiedAuthContainer = window.localStorage.getItem('lichess-auth-token');
		if (JSONifiedAuthContainer) {
			const cachedAuthToken = (JSON.parse(JSONifiedAuthContainer) as typeof authToken)?.token;
			// Assumes that putting the expiry into the date constructor works! https://jsdate.wtf/ reference
			if (cachedAuthToken && new SvelteDate() < new SvelteDate(cachedAuthToken.expiry)) {
				authToken.token = cachedAuthToken;
				return
			}
		}

		// Redirect to authentication prompt.
		await this.oauth.fetchAuthorizationCode();
	}

	async init() {
		try {
			const hasAuthCode = await this.oauth.isReturningFromAuthServer();
			if (hasAuthCode) {
				// Might want to persist accessContext.token until the user logs out.
				this.accessContext = await this.oauth.getAccessToken();

				const token = this.accessContext.token
				if (!token) throw new Error('Token received but is undefined!');
				authToken.token = token;

				// cache
				window.localStorage.setItem('lichess-auth-token', JSON.stringify(authToken));
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
				Authorization: `Bearer ${token}`
			}
		});
	}
}
