const CALLBACK_PATH = '/callback';
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_SCOPE = 'repo,user';
const OAUTH_STATE_MAX_AGE = 600;
const CMS_ORIGIN = 'https://shuohui.uk';

function buildHeaders(extraHeaders = {}) {
  return {
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  };
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createRandomToken(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function escapeScriptValue(value) {
  return value
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function callbackResponse(body, status, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: buildHeaders({
      'Content-Type': 'text/plain;charset=UTF-8',
      'Set-Cookie': buildCallbackCookie(),
      ...extraHeaders,
    }),
  });
}

export function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return cookies;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      cookies[trimmed] = '';
      return cookies;
    }

    const name = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    cookies[name] = value;
    return cookies;
  }, {});
}

export function buildAuthorizeUrl(requestUrl, clientId, state) {
  const request = new URL(requestUrl);
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${request.origin}${CALLBACK_PATH}`);
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPE);
  authorizeUrl.searchParams.set('state', state);
  return authorizeUrl.toString();
}

export function buildStateCookie(state, maxAgeSeconds = OAUTH_STATE_MAX_AGE) {
  return [
    `${OAUTH_STATE_COOKIE}=${state}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function buildCallbackCookie() {
  return [
    `${OAUTH_STATE_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function createSuccessHtml(accessToken, targetOrigin, nonce = 'test-nonce') {
  const message = escapeScriptValue(JSON.stringify(
    `authorization:github:success:${JSON.stringify({ token: accessToken, provider: 'github' })}`,
  ));
  const origin = escapeScriptValue(JSON.stringify(targetOrigin));

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>授权成功</title>
  </head>
  <body>
    <p id="status">身份验证成功！正在返回系统...</p>
    <script nonce="${nonce}">
      const message = ${message};
      const targetOrigin = ${origin};
      const statusNode = document.getElementById('status');
      if (window.opener && typeof window.opener.postMessage === 'function') {
        window.opener.postMessage(message, targetOrigin);
        setTimeout(() => window.close(), 1000);
      } else {
        statusNode.textContent = '身份验证成功。请返回原窗口继续。';
      }
    </script>
  </body>
</html>`;
}

async function exchangeCodeForToken(code, clientId, clientSecret) {
  let tokenResponse;

  try {
    tokenResponse = await globalThis.fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Shuohui-OAuth-Gateway',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
  } catch {
    return null;
  }

  if (!tokenResponse.ok) {
    return null;
  }

  let tokenData;
  try {
    tokenData = await tokenResponse.json();
  } catch {
    return null;
  }

  if (typeof tokenData?.access_token !== 'string' || tokenData.access_token.length === 0) {
    return null;
  }

  return tokenData.access_token;
}

function createHtmlResponse(html, nonce) {
  return new Response(html, {
    status: 200,
    headers: buildHeaders({
      'Content-Type': 'text/html;charset=UTF-8',
      'Set-Cookie': buildCallbackCookie(),
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    }),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;

    if (url.pathname !== '/auth' && url.pathname !== CALLBACK_PATH) {
      return new Response('Not Found', { status: 404, headers: buildHeaders() });
    }

    if (!clientId || !clientSecret) {
      if (url.pathname === CALLBACK_PATH) {
        return callbackResponse('OAuth gateway misconfigured.', 500);
      }
      return new Response('OAuth gateway misconfigured.', {
        status: 500,
        headers: buildHeaders({ 'Content-Type': 'text/plain;charset=UTF-8' }),
      });
    }

    if (url.pathname === '/auth') {
      const state = createRandomToken();
      const redirectUrl = buildAuthorizeUrl(request.url, clientId, state);
      return new Response(null, {
        status: 302,
        headers: buildHeaders({
          Location: redirectUrl,
          'Set-Cookie': buildStateCookie(state),
        }),
      });
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const cookies = parseCookies(request.headers.get('Cookie'));
    const expectedState = cookies[OAUTH_STATE_COOKIE];

    if (oauthError) {
      return callbackResponse('OAuth authorization failed.', 400);
    }

    if (!code || !state || !expectedState || expectedState !== state) {
      return callbackResponse('Invalid OAuth state or code.', 400);
    }

    const accessToken = await exchangeCodeForToken(code, clientId, clientSecret);
    if (!accessToken) {
      return callbackResponse('OAuth token exchange failed.', 502);
    }

    const nonce = createNonce();
    const html = createSuccessHtml(accessToken, CMS_ORIGIN, nonce);
    return createHtmlResponse(html, nonce);
  }
};
