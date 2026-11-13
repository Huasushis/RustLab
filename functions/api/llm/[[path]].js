// Cloudflare Pages Function：AI 助教的转发代理，规则见 shared/llm-proxy.mjs
import { proxyLlm } from '../../../shared/llm-proxy.mjs';

export function onRequest({ request, params, env }) {
  return proxyLlm(request, [].concat(params.path ?? []), env);
}
