addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // 1. /auth — 重定向到 GitHub 授权页
  if (url.pathname === '/auth') {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo,user',
      redirect_uri: url.origin + '/callback'
    })
    return Response.redirect(
      'https://github.com/login/oauth/authorize?' + params.toString(),
      302
    )
  }

  // 2. /callback — 交换 code 换取 token，postMessage + close 弹窗
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code')
    if (!code) return new Response('Missing code', { status: 400 })

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code
      })
    })

    const tokenData = await tokenResponse.json()
    const token = tokenData.access_token

    if (!token) {
      return new Response('Failed to exchange token: ' + JSON.stringify(tokenData), { status: 500 })
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Authenticated</title></head>
    <body>
      <p>认证成功！正在同步安全凭证，即将进入系统...</p>
      <script>
        (function() {
          const targetWindow = window.opener || window.parent;
          if (targetWindow) {
            const message = 'authorization:github:success:{"token":"${token}","provider":"github"}';
            targetWindow.postMessage(message, "*");
            window.close();
          } else {
            document.body.innerText = "认证成功，但未能联系到主控制台，请手动刷新。";
          }
        })()
      </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // 3. 兜底
  return new Response('Decap CMS OAuth Gateway is operational!', { status: 200 })
}
