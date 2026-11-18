import type { CaptureResult } from 'posthog-js'

// Messages raised by WebExtension messaging APIs inside a visitor's own browser
// extension. They surface on `window`, so `capture_exceptions` picks them up,
// but they carry no application stack frames and point at no product code.
const EXTENSION_MESSAGE_PATTERNS: RegExp[] = [
  /runtime\.sendMessage/i,
  /tabs\.sendMessage/i,
  /\btab not found\b/i,
  /could not establish connection.*receiving end does not exist/i,
  /the message port closed before a response was received/i,
  /extension context invalidated/i,
]

type CapturedException = {
  value?: string
  stacktrace?: { frames?: unknown[] }
}

function isStacklessExtensionError(exception: CapturedException): boolean {
  const frames = exception.stacktrace?.frames
  if (Array.isArray(frames) && frames.length > 0) return false

  const message = exception.value ?? ''
  return EXTENSION_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
}

// Drops an exception event only when every exception in it is stackless and
// matches a known browser-extension messaging error. Any other event, and any
// exception that has stack frames or an unknown message, passes through.
export function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event || event.event !== '$exception') return event

  const exceptions = event.properties?.$exception_list as
    | CapturedException[]
    | undefined
  if (!Array.isArray(exceptions) || exceptions.length === 0) return event

  return exceptions.every(isStacklessExtensionError) ? null : event
}
