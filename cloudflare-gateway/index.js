export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const client_id = env.GITHUB_CLIENT_ID;
    const client_secret = env.GITHUB_CLIENT_SECRET;

    // 路由 1：发起授权请求
    if (url.pathname === "/auth") {
      // 绝杀点 1：必须带上 scope=repo,user，否则后端无法获取写权限
      const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user`;
      return Response.redirect(redirectUrl, 302);
    }

    // 路由 2：处理 GitHub 回调并返回 Token
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Shuohui-OAuth-Gateway"
        },
        body: JSON.stringify({ client_id, client_secret, code }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return new Response(`Error from GitHub: ${tokenData.error}`, { status: 500 });
      }

      // 绝杀点 2：返回通信页面，并强制延迟 1000 毫秒关闭窗口以应对进程隔离
      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>授权成功</title></head>
        <body>
          <p>身份验证成功！正在返回系统...</p>
          <script>
            const message = 'authorization:github:success:{"token":"${tokenData.access_token}","provider":"github"}';
            window.opener.postMessage(message, "*");
            // 延迟 1 秒，确保母页面有充足时间验证来源窗口存活状态
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
        </html>
      `;
      return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};
