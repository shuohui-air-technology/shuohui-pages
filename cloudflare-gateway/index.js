// Cloudflare Workers — Decap CMS GitHub OAuth Gateway
// Deploy with: wrangler deploy
// Required secrets: wrangler secret put GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET

const OAUTH_ORIGIN = 'https://shuohui-cms-oauth.shuohui.workers.dev'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/auth') {
      return handleAuth(url, env)
    }

    if (url.pathname === '/callback') {
      return handleCallback(request, url, env)
    }

    return new Response('Decap CMS OAuth Gateway — operational', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }
}

function handleAuth(url, env) {
  const redirectUri = `${OAUTH_ORIGIN}/callback`
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: 'repo,user',
    redirect_uri: redirectUri
  })
  return Response.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
    302
  )
}

async function handleCallback(request, url, env) {
  const code = url.searchParams.get('code')
  if (!code) {
    return new Response('Missing authorization code', { status: 400 })
  }

  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code
    })
  })

  const data = await tokenResp.json()
  if (data.error) {
    return new Response(`OAuth error: ${data.error_description || data.error}`, { status: 400 })
  }

  // Post token back to Decap CMS via window.opener
  const html = `<!DOCTYPE html>
<html>
<body>
<script>
  window.opener.postMessage(
    ${JSON.stringify({
      token: data.access_token,
      provider: 'github'
    })},
    '*'
  )
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
