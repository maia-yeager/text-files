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
import { sync } from "./sync"

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
    let result = await env.KV.get(url.pathname)
    // If nothing is stored in KV, sync the target path if defined.
    if (result === null) {
      const target = PATH_TARGET_MAP.get(url.pathname)
      if (target !== undefined) {
        result = await sync(env, url.pathname, target)
      }
    }

    if (result !== null) {
      // Create cache headers.
      const headerName = "Cache-Control"
      const headers = new Headers()
      headers.append(headerName, "public")
      headers.append(headerName, `max-age=${60 * 60}`) // 1 hour
      headers.append(headerName, `s-maxage=${24 * 60 * 60}`) // 1 day

      return new Response(result, { headers })
    }
    return new Response(null, { status: 404 })
  },
  async scheduled(_, env) {
    const start = Date.now()
    console.info("Starting sync.")
    await Promise.all(
      Array.from(PATH_TARGET_MAP).map(([path, target]) =>
        sync(env, path, target),
      ),
    )
    const end = Date.now()

    const duration = (end - start) / 1_000
    console.info(`Sync finished in ${duration.toFixed(2)} seconds.`)
  },
} satisfies ExportedHandler<Env>
