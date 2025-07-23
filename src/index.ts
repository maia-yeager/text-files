/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const PATH_TARGET_MAP = new Map([
  [
    "/robots.txt",
    "https://github.com/ai-robots-txt/ai.robots.txt/releases/latest/download/robots.txt",
  ],
])

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    // No need to account for assets, since those will be served automatically.
    const result = await env.KV.get(url.pathname)
    if (result !== null) {
      return new Response(result)
    }
    return new Response(null, { status: 404 })
  },
  async scheduled(_, env) {
    const start = Date.now()
    console.info("Starting sync.")
    for (const [path, target] of PATH_TARGET_MAP) {
      const current = await env.KV.get(path)

      const response = await fetch(target)
      if (!response.ok) {
        console.error(
          `Error while retrieving latest ${path}: (${response.status}) ${response.statusText}`,
        )
        continue
      }
      const latest = await response.text()

      if (current !== latest) {
        await env.KV.put(path, latest)
        console.info(`Updated ${path}!`)
      } else {
        console.info(`No change for ${path}.`)
      }
    }
    const end = Date.now()

    const duration = (end - start) / 1_000
    console.info(`Sync finished in ${duration.toFixed(2)} seconds.`)
  },
} satisfies ExportedHandler<Env>
