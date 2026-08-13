import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  buildAuthorizeUrl,
  buildCallbackCookie,
  buildStateCookie,
  createSuccessHtml,
  parseCookies,
} from './index.js';

test('parseCookies reads the state cookie without decoding unrelated values', () => {
  assert.deepEqual(parseCookies('oauth_state=abc; other=value'), {
    oauth_state: 'abc',
    other: 'value',
  });
});

test('buildAuthorizeUrl preserves the callback route and encodes state', () => {
  const url = new URL(buildAuthorizeUrl(
    'https://shuohui-cms-oauth.shuohui.workers.dev/auth',
    'client-id',
    'state value',
  ));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/login/oauth/authorize');
  assert.equal(url.searchParams.get('client_id'), 'client-id');
  assert.equal(url.searchParams.get('state'), 'state value');
  assert.equal(url.searchParams.get('scope'), 'repo,user');
  assert.equal(
    url.searchParams.get('redirect_uri'),
    'https://shuohui-cms-oauth.shuohui.workers.dev/callback',
  );
});

test('state cookies are secure and expire after the callback', () => {
  assert.match(buildStateCookie('abc'), /oauth_state=abc/);
  assert.match(buildStateCookie('abc'), /HttpOnly/);
  assert.match(buildStateCookie('abc'), /Secure/);
  assert.match(buildStateCookie('abc'), /SameSite=Lax/);
  assert.match(buildStateCookie('abc'), /Max-Age=600/);
  assert.match(buildCallbackCookie(), /oauth_state=/);
  assert.match(buildCallbackCookie(), /Max-Age=0/);
});

test('success HTML posts only to the CMS origin and keeps tokens out of URLs', () => {
  const html = createSuccessHtml('test-token', 'https://shuohui.uk');
  assert.match(html, /https:\/\/shuohui\.uk/);
  assert.doesNotMatch(html, /postMessage\([^,]+,\s*["']\*["']\)/);
  assert.doesNotMatch(html, /location\.(href|replace|assign)/);
  assert.doesNotMatch(html, /[?&#]token=/);
  assert.match(html, /authorization:github:success:/);
});

test('auth returns an authorization redirect and state cookie', async () => {
  const response = await worker.fetch(
    new Request('https://shuohui-cms-oauth.shuohui.workers.dev/auth'),
    { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
  );
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location'), /github\.com\/login\/oauth\/authorize/);
  assert.match(response.headers.get('location'), /state=/);
  assert.match(response.headers.get('set-cookie'), /oauth_state=/);
});

test('callback rejects a mismatched state before contacting GitHub', async () => {
  const originalFetch = globalThis.fetch;
  try {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error('should not be called');
    };
    const response = await worker.fetch(
      new Request(
        'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=wrong',
        { headers: { Cookie: 'oauth_state=expected' } },
      ),
      { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
    );
    assert.equal(response.status, 400);
    assert.equal(called, false);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callback returns an explicit OAuth error response and clears state', async () => {
  const response = await worker.fetch(
    new Request(
      'https://shuohui-cms-oauth.shuohui.workers.dev/callback?error=access_denied&state=expected',
      { headers: { Cookie: 'oauth_state=expected' } },
    ),
    { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
  );
  assert.equal(response.status, 400);
  assert.match(await response.text(), /oauth/i);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('misconfigured callback response clears state', async () => {
  const response = await worker.fetch(
    new Request(
      'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=expected',
      { headers: { Cookie: 'oauth_state=expected' } },
    ),
    { GITHUB_CLIENT_ID: 'client-id' },
  );

  assert.equal(response.status, 500);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('callback exchanges a valid code and returns the Sveltia success message', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ access_token: 'test-token' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
    const response = await worker.fetch(
      new Request(
        'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=expected',
        { headers: { Cookie: 'oauth_state=expected' } },
      ),
      { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
    );
    assert.equal(response.status, 200);
    assert.match(await response.text(), /authorization:github:success:/);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callback hides upstream OAuth errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'bad_verification_code' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
    const response = await worker.fetch(
      new Request(
        'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=expected',
        { headers: { Cookie: 'oauth_state=expected' } },
      ),
      { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
    );
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /bad_verification_code/);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
