import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';
import type { AccessContext, AccessToken } from '@bity/oauth2-auth-code-pkce';
import { SvelteDate } from 'svelte/reactivity';

export const lichessHost = 'https://lichess.org';
export const scopes = ['study:read'];
export const clientId = 'choob.com';
export let auth = $state<{ token?: AccessToken, username?: string }>({});

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
			},
		});
	}

	async login() {
		// Redirect to authentication prompt.
		await this.oauth.fetchAuthorizationCode();
	}

	async init() {
		// check cache
		const JSONcachedAuth = window.localStorage.getItem('lichess-auth-token');
		if (JSONcachedAuth) {
			const cachedAuth = JSON.parse(JSONcachedAuth) as typeof auth
			const cachedAuthToken = cachedAuth?.token;
			// Assumes that putting the expiry into the date constructor works! https://jsdate.wtf/ reference
			if (cachedAuthToken && cachedAuth.username && new SvelteDate() < new SvelteDate(cachedAuthToken.expiry)) {
				auth.token = cachedAuthToken;
				auth.username = cachedAuth.username;
				return;
			}
		}

		try {
			const hasAuthCode = await this.oauth.isReturningFromAuthServer();
			if (hasAuthCode) {
				// Might want to persist accessContext.token until the user logs out.
				this.accessContext = await this.oauth.getAccessToken();

				const token = this.accessContext.token;
				if (!token) throw new Error('Token received but is undefined!');
				auth.token = token;

				
				// set username
				fetch("https://lichess.org/api/account", { headers: { Authorization: `Bearer ${auth?.token?.value}`}}).then(async response => {
					const json = await response.json()
					auth.username = json.username
					
					// cache
					window.localStorage.setItem('lichess-auth-token', JSON.stringify(auth));
				})
			}
		} catch (err) {
			this.error = err;
		}
	}

	async logout() {
		const token = this.accessContext?.token?.value;
		this.accessContext = undefined;
		this.error = undefined;
		auth.token = undefined;
		auth.username = undefined;

		// clear cache
		window.localStorage.removeItem('lichess-auth-token');

		// Example request using vanilla fetch: Revoke access token.
		await fetch(`${lichessHost}/api/token`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
	}
}
