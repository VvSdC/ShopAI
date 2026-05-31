import dotenv from 'dotenv'

dotenv.config()

function env(key, fallback = undefined) {
  const value = process.env[key]
  if (value === undefined || value === '') {
    return fallback
  }
  return value
}

function envInt(key, fallback) {
  const raw = env(key)
  if (raw === undefined) return fallback
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function envBool(key, fallback = false) {
  const raw = env(key)
  if (raw === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

const nodeEnv = env('NODE_ENV', 'development')

/** @type {import('./env.types.js').AppConfig} */
export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  server: {
    port: envInt('PORT', 2030),
    host: env('HOST', '0.0.0.0'),
    trustProxy: envBool('TRUST_PROXY', nodeEnv === 'production'),
  },

  db: {
    mongoUrl: env('MONGO_URL', 'mongodb://127.0.0.1:27017/ShopAI'),
  },

  cors: {
    origin: env('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  },

  auth: {
    jwtKey: env('JWT_KEY', ''),
    jwtRefreshKey: env('JWT_REFRESH_KEY', ''),
  },

  stripe: {
    secretKey: env('STRIPE_KEY', ''),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET', ''),
  },

  cloudinary: {
    cloudName: env('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: env('CLOUDINARY_API_KEY', ''),
    apiSecret: env('CLOUDINARY_API_SECRET_KEY', ''),
  },

  email: {
    provider: env('EMAIL_PROVIDER', 'resend'),
    from: env('EMAIL_FROM', 'ShopAI <noreply@example.com>'),
    resendApiKey: env('RESEND_API_KEY', ''),
    brevoApiKey: env('BREVO_API_KEY', ''),
  },

  llm: {
    openRouter: {
      apiKey: env('OPENROUTER_API_KEY', ''),
      model: env('OPENROUTER_MODEL', 'qwen/qwen3-8b'),
    },
    gemini: {
      apiKey: env('GEMINI_API_KEY', env('GOOGLE_API_KEY', '')),
      model: env('GEMINI_MODEL', 'gemini-2.0-flash'),
    },
    mistral: {
      apiKey: env('MISTRAL_API_KEY', ''),
      model: env('MISTRAL_MODEL', 'mistral-small-latest'),
    },
    huggingFace: {
      apiKey: env('HUGGINGFACE_API_KEY', ''),
      model: env('HUGGINGFACE_MODEL', 'Qwen/Qwen2.5-7B-Instruct'),
    },
    groq: {
      apiKey: env('GROQ_API_KEY', ''),
      model: env('GROQ_MODEL', 'llama-3.1-8b-instant'),
    },
  },

  search: {
    embedding: {
      provider: env('EMBEDDING_PROVIDER', 'huggingface'),
      model: env('EMBEDDING_MODEL', 'BAAI/bge-m3'),
      dimension: envInt('EMBEDDING_DIMENSION', 1024),
      openRouterModel: env('OPENROUTER_EMBEDDING_MODEL', 'openai/text-embedding-3-small'),
      geminiModel: env('GEMINI_EMBEDDING_MODEL', 'text-embedding-004'),
      voyageModel: env('VOYAGE_EMBEDDING_MODEL', 'voyage-3-lite'),
      jinaModel: env('JINA_EMBEDDING_MODEL', 'jina-embeddings-v3'),
    },
    rerank: {
      enabled: envBool('RERANK_ENABLED', true),
      provider: env('RERANK_PROVIDER', 'voyage'),
      model: env('RERANK_MODEL', 'rerank-2.5'),
      topN: envInt('RERANK_TOP_N', 30),
      openRouterModel: env('OPENROUTER_RERANK_MODEL', 'cohere/rerank-v3.5'),
      hfModel: env('HF_RERANK_MODEL', 'BAAI/bge-reranker-v2-m3'),
      jinaModel: env('JINA_RERANK_MODEL', 'jina-reranker-v2-base-multilingual'),
      cohereModel: env('COHERE_RERANK_MODEL', 'rerank-v3.5'),
    },
    voyageApiKey: env('VOYAGE_API_KEY', ''),
    jinaApiKey: env('JINA_API_KEY', ''),
    cohereApiKey: env('COHERE_API_KEY', ''),
    vectorIndex: env('ATLAS_VECTOR_INDEX', 'product_vector_index'),
    vectorCandidates: envInt('SEARCH_VECTOR_CANDIDATES', 100),
    vectorLimit: envInt('SEARCH_VECTOR_LIMIT', 50),
    keywordLimit: envInt('SEARCH_KEYWORD_LIMIT', 50),
    rrfK: envInt('SEARCH_RRF_K', 60),
    embeddingVersion: envInt('SEARCH_EMBEDDING_VERSION', 1),
    autoSyncEmbeddings: envBool('SEARCH_AUTO_SYNC_EMBEDDINGS', true),
    syncDelayMs: envInt('SEARCH_SYNC_DELAY_MS', 1200),
    syncStartupDelayMs: envInt('SEARCH_SYNC_STARTUP_DELAY_MS', 5000),
    syncMaxPerRun: envInt('SEARCH_SYNC_MAX_PER_RUN', 0),
  },

  rateLimit: {
    api: {
      windowMs: envInt('RATE_LIMIT_API_WINDOW_MS', 15 * 60 * 1000),
      max: envInt('RATE_LIMIT_API_MAX', 200),
    },
    auth: {
      windowMs: envInt('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000),
      max: envInt('RATE_LIMIT_AUTH_MAX', 15),
    },
    chat: {
      windowMs: envInt('RATE_LIMIT_CHAT_WINDOW_MS', 60 * 1000),
      max: envInt('RATE_LIMIT_CHAT_MAX', 15),
    },
  },
}

/** Warn or fail on missing secrets — strict in production, lenient in dev/test. */
export function validateConfig(options = {}) {
  const { strict = config.isProduction } = options
  const missing = []

  if (!config.db.mongoUrl) missing.push('MONGO_URL')
  if (!config.auth.jwtKey) missing.push('JWT_KEY')
  if (!config.auth.jwtRefreshKey) missing.push('JWT_REFRESH_KEY')

  if (strict && !config.stripe.secretKey) missing.push('STRIPE_KEY')

  if (missing.length === 0) return { ok: true, missing: [] }

  const message = `Missing required configuration: ${missing.join(', ')}`

  if (strict) {
    throw new Error(message)
  }

  console.warn(`[config] ${message}`)
  return { ok: false, missing }
}

export default config
