import { RequestMethod, ResponseType, type RequestOptions, type RequestResponse } from '../types/types'

export async function makeRequest<Type extends ResponseType>(
  url: string,
  options: RequestOptions<Type>,
): Promise<RequestResponse[Type]> {
  const parsedUrl = new URL(url)

  if (options.params) {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(options.params)) searchParams.append(key, String(value))

    parsedUrl.search = searchParams.toString()
  }

  const controller = new AbortController()
  const timeout = options.timeout ?? 60 * 1000

  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(parsedUrl.toString(), {
      method: options.method,
      signal: controller.signal,
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.body && options.method !== RequestMethod.GET
        ? {
            body:
              options.body instanceof FormData || typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body),
          }
        : {}),
    })

    if (!res.ok) throw new Error(`Request failed (${res.status}): ${await res.text()}`)

    switch (options.response) {
      case ResponseType.JSON:
        return (await res.json()) as RequestResponse[Type]
      case ResponseType.BUFFER:
        return Buffer.from(await res.arrayBuffer()) as RequestResponse[Type]
      case ResponseType.TEXT:
        return (await res.text()) as RequestResponse[Type]
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Request timed out')

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
