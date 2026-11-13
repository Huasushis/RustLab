// Cloudflare Pages Function：把 /api/rust/execute 和 /api/rust/format 转发到官方 Rust Playground。
// 用于官方地址在某些网络下访问不畅的情况。免费额度：每天 10 万次请求。
const UPSTREAM = 'https://play.rust-lang.org';
const ALLOWED = new Set(['execute', 'format']);
const MAX_BODY = 200_000;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export async function onRequest({ request, params }) {
  const path = [].concat(params.path ?? []).join('/');
  if (request.method !== 'POST' || !ALLOWED.has(path)) return json(404, { error: 'not found' });

  const body = await request.text();
  if (body.length > MAX_BODY) return json(413, { error: '代码太长了' });

  const res = await fetch(`${UPSTREAM}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
