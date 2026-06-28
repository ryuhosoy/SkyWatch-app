const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const TOKEN_REFRESH_MARGIN_MS = 30_000;

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

interface OpenSkyCredentials {
  clientId: string;
  clientSecret: string;
}

function getCredentials(): OpenSkyCredentials | null {
  const clientId = process.env.EXPO_PUBLIC_OPENSKY_CLIENT_ID;
  const clientSecret = process.env.EXPO_PUBLIC_OPENSKY_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }

  return null;
}

class OpenSkyTokenManager {
  private token: string | null = null;
  private expiresAt = 0;
  private refreshPromise: Promise<string> | null = null;

  constructor(private readonly credentials: OpenSkyCredentials) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  invalidate(): void {
    this.token = null;
    this.expiresAt = 0;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt) {
      return this.token;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async refresh(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`OpenSky auth error: ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.token = data.access_token;
    const expiresInMs = (data.expires_in ?? 1800) * 1000;
    this.expiresAt = Date.now() + expiresInMs - TOKEN_REFRESH_MARGIN_MS;
    return this.token;
  }
}

let tokenManager: OpenSkyTokenManager | null = null;

export function getOpenSkyTokenManager(): OpenSkyTokenManager | null {
  if (tokenManager) return tokenManager;

  const credentials = getCredentials();
  if (!credentials) return null;

  tokenManager = new OpenSkyTokenManager(credentials);
  return tokenManager;
}

export async function getOpenSkyRequestHeaders(): Promise<Record<string, string>> {
  const manager = getOpenSkyTokenManager();
  if (manager) {
    return manager.getAuthHeaders();
  }

  return { Accept: 'application/json' };
}

export async function fetchOpenSkyWithAuth(url: string): Promise<Response> {
  const manager = getOpenSkyTokenManager();
  let headers = await getOpenSkyRequestHeaders();
  let response = await fetch(url, { headers });

  if (response.status === 401 && manager) {
    manager.invalidate();
    headers = await getOpenSkyRequestHeaders();
    response = await fetch(url, { headers });
  }

  return response;
}
