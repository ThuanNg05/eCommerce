const DEFAULT_HEALTH_PATH = "/health/live";

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(pingRender(env));
  },
};

async function pingRender(env) {
  const baseUrl = String(env.RENDER_API_URL ?? "").trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("RENDER_API_URL is not configured.");
  }

  const healthPath = String(env.RENDER_HEALTH_PATH ?? DEFAULT_HEALTH_PATH).trim();
  const healthUrl = new URL(healthPath, `${baseUrl}/`);

  const response = await fetch(healthUrl, {
    method: "GET",
    headers: {
      "User-Agent": "ecommerce-render-keepalive/1.0",
      Accept: "application/json",
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false,
    },
  });

  if (!response.ok) {
    throw new Error(`Render health check failed with HTTP ${response.status}.`);
  }
}
