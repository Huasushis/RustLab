// Cloudflare Pages Function：AI 助教的转发代理，解决部分模型服务商不允许浏览器跨域访问的问题。
//
//   浏览器请求  /api/llm/<host>/<path>   →   转发到  https://<host>/<path>
//
// - 只转发到白名单里的主机（可用环境变量 LLM_PROXY_HOSTS 覆盖，逗号分隔）
// - 只接受来自本站页面的请求（校验 Origin），避免被其它网站当成公共代理
// - API Key 由浏览器随请求发来，本函数不记录、不保存
const DEFAULT_HOSTS = [
  'api.anthropic.com',
  'api.deepseek.com',
  'dashscope.aliyuncs.com',
  'open.bigmodel.cn',
  'api.moonshot.cn',
  'api.siliconflow.cn',
  'openrouter.ai',
  'generativelanguage.googleapis.com',
  'api.openai.com',
];

// 只转发这些请求头（其余的如 Cookie 一律丢弃）
const FORWARD_HEADERS = [
  'content-type',
  'accept',
  'authorization',
  'x-api-key',
  'anthropic-version',
  'anthropic-beta',
  'http-referer',
  'x-title',
];

const json = (status, body) =>
  new Response(JSON.stringify({ error: body }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json(403, '只允许本站页面使用这个代理');
  if (request.method !== 'POST' && request.method !== 'GET') return json(405, 'method not allowed');

  const [host, ...rest] = [].concat(params.path ?? []);
  const allowed = (env.LLM_PROXY_HOSTS ? env.LLM_PROXY_HOSTS.split(',') : DEFAULT_HOSTS).map((h) => h.trim());
  if (!host || !allowed.includes(host)) {
    return json(403, `不允许转发到 ${host ?? '(空)'}。站点管理员可以在 Cloudflare 的环境变量 LLM_PROXY_HOSTS 里添加。`);
  }

  const headers = new Headers();
  for (const h of FORWARD_HEADERS) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  const target = `https://${host}/${rest.map(encodeURIComponent).join('/')}${url.search}`;
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
  });

  // 原样把（可能是流式的）响应体传回浏览器
  const out = new Headers();
  for (const h of ['content-type', 'cache-control', 'request-id', 'x-request-id']) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers: out });
}
