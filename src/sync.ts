export async function sync(
  env: Env,
  path: string,
  target: string | URL,
): Promise<string | null> {
  const current = await env.KV.get(path)

  const response = await fetch(target)
  if (!response.ok) {
    console.error(
      `Error while retrieving latest ${path}: (${response.status}) ${response.statusText}`,
    )
    return current
  }
  const latest = await response.text()

  if (current !== latest) {
    await env.KV.put(path, latest)
    console.info(`Updated ${path}!`)
    return latest
  }
  console.info(`No change for ${path}.`)
  return current
}
