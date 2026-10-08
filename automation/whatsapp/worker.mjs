// Cloudflare Worker entry point. Kept thin: everything testable lives in service.cjs.
import answerBase from '../../specs/002-faq-base.md';
import service from './service.cjs';

const WEBHOOK_PATH = '/webhook/ycloud';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== WEBHOOK_PATH) {
      return new Response('Not found', { status: 404 });
    }

    const status = await service.createService(env, answerBase).handleWebhook({
      rawBody: await request.text(),
      signature: request.headers.get('YCloud-Signature'),
    });
    return new Response(null, { status });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(service.createService(env, answerBase).sendDueReminders());
  },
};
