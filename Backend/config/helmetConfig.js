import { config } from './env.js'

/** Collect origins allowed for connectSrc / formAction (frontend + API). */
export function resolveSecurityOrigins() {
  const origins = new Set(["'self'"])
  if (config.cors.origin) {
    origins.add(config.cors.origin)
  }
  if (config.server.publicUrl) {
    origins.add(config.server.publicUrl)
  }
  return [...origins]
}

/** Explicit Helmet options — do not rely on upstream default CSP changes. */
export function buildHelmetOptions() {
  const connectSrc = resolveSecurityOrigins()
  const formAction = connectSrc.filter((value) => value !== "'self'")

  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc,
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", ...formAction],
        ...(config.isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }
}
