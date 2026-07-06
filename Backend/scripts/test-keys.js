/**
 * Validates configured API keys (reads Backend/.env via config/env.js). Does not print secret values.
 * Usage: node scripts/test-keys.js
 */
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import config from '../config/env.js'
import { getStripeClient, hasStripeConfigured } from '../config/stripeClient.js'
import logger from '../utils/logger.js'

const results = []

function record(name, status, detail = '') {
  results.push({ name, status, detail })
  const icon = status === 'ok' ? 'OK' : status === 'skip' ? 'SKIP' : 'FAIL'
  logger.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ''}`)
}

function hasValue(value) {
  return value !== undefined && String(value).trim() !== ''
}

async function testMongo() {
  if (!hasValue(config.db.mongoUrl)) return record('MongoDB', 'fail', 'MONGO_URL missing')
  try {
    await mongoose.connect(config.db.mongoUrl, { serverSelectionTimeoutMS: 8000 })
    await mongoose.connection.db.admin().command({ ping: 1 })
    record('MongoDB', 'ok', mongoose.connection.host)
  } catch (err) {
    record('MongoDB', 'fail', err.message)
  } finally {
    await mongoose.disconnect().catch(() => {})
  }
}

async function testStripe() {
  if (!hasStripeConfigured()) return record('Stripe', 'skip', 'STRIPE_KEY not set')
  try {
    const stripe = getStripeClient()
    await stripe.balance.retrieve()
    record('Stripe', 'ok')
  } catch (err) {
    record('Stripe', 'fail', err.message)
  }
}

function testCloudinary() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary
  if (!hasValue(cloudName) || !hasValue(apiKey) || !hasValue(apiSecret)) {
    return record('Cloudinary', 'skip', 'keys incomplete')
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })
  try {
    const sig = cloudinary.utils.api_sign_request({ timestamp: Math.floor(Date.now() / 1000) }, apiSecret)
    record('Cloudinary', sig ? 'ok' : 'fail', 'sign check')
  } catch (err) {
    record('Cloudinary', 'fail', err.message)
  }
}

async function testResend() {
  if (!hasValue(config.email.resendApiKey)) return record('Resend', 'skip')
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${config.email.resendApiKey}` },
    })
    record('Resend', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Resend', 'fail', err.message)
  }
}

async function testBrevo() {
  if (!hasValue(config.email.brevoApiKey)) return record('Brevo', 'skip')
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': config.email.brevoApiKey },
    })
    record('Brevo', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Brevo', 'fail', err.message)
  }
}

async function testOpenRouterChat() {
  if (!hasValue(config.llm.openRouter.apiKey)) return record('OpenRouter (chat)', 'skip')
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models?output_modalities=text', {
      headers: { Authorization: `Bearer ${config.llm.openRouter.apiKey}` },
    })
    record('OpenRouter (chat)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('OpenRouter (chat)', 'fail', err.message)
  }
}

async function testOpenRouterEmbed() {
  if (!hasValue(config.llm.openRouter.apiKey)) return record('OpenRouter (embed)', 'skip')
  const model = config.search.embedding.openRouterModel
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llm.openRouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: 'test' }),
    })
    const data = await res.json().catch(() => ({}))
    record('OpenRouter (embed)', res.ok ? 'ok' : 'fail', res.ok ? `dims=${data?.data?.[0]?.embedding?.length ?? '?'}` : `HTTP ${res.status}`)
  } catch (err) {
    record('OpenRouter (embed)', 'fail', err.message)
  }
}

async function testOpenRouterRerank() {
  if (!hasValue(config.llm.openRouter.apiKey)) return record('OpenRouter (rerank)', 'skip')
  const model = config.search.rerank.openRouterModel
  try {
    const res = await fetch('https://openrouter.ai/api/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llm.openRouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        query: 'cricket bat',
        documents: ['MRF cricket bat', 'Winter jacket'],
        top_n: 2,
      }),
    })
    record('OpenRouter (rerank)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('OpenRouter (rerank)', 'fail', err.message)
  }
}

async function testGeminiChat() {
  const key = config.llm.gemini.apiKey
  if (!key) return record('Gemini (chat)', 'skip')
  const model = config.llm.gemini.model
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hi in one word' }] }] }),
      }
    )
    record('Gemini (chat)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Gemini (chat)', 'fail', err.message)
  }
}

async function testGeminiEmbed() {
  const key = config.llm.gemini.apiKey
  if (!key) return record('Gemini (embed)', 'skip')
  const model = config.search.embedding.geminiModel
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: 'test embed' }] } }),
      }
    )
    const data = await res.json().catch(() => ({}))
    record('Gemini (embed)', res.ok ? 'ok' : 'fail', res.ok ? `dims=${data?.embedding?.values?.length ?? '?'}` : `HTTP ${res.status}`)
  } catch (err) {
    record('Gemini (embed)', 'fail', err.message)
  }
}

async function testMistral() {
  if (!hasValue(config.llm.mistral.apiKey)) return record('Mistral', 'skip')
  try {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${config.llm.mistral.apiKey}` },
    })
    record('Mistral', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Mistral', 'fail', err.message)
  }
}

async function testGroq() {
  if (!hasValue(config.llm.groq.apiKey)) return record('Groq', 'skip')
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${config.llm.groq.apiKey}` },
    })
    record('Groq', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Groq', 'fail', err.message)
  }
}

async function testHuggingFaceChat() {
  if (!hasValue(config.llm.huggingFace.apiKey)) return record('HuggingFace (chat)', 'skip')
  const model = config.llm.huggingFace.model
  try {
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llm.huggingFace.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })
    record('HuggingFace (chat)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('HuggingFace (chat)', 'fail', err.message)
  }
}

async function testHuggingFaceEmbed() {
  if (!hasValue(config.llm.huggingFace.apiKey)) return record('HuggingFace (embed)', 'skip')
  const model = config.search.embedding.model
  const url = `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llm.huggingFace.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: 'shopai test embedding' }),
    })
    const data = await res.json().catch(() => null)
    const dims = Array.isArray(data?.[0]) ? data[0].length : data?.length
    record('HuggingFace (embed)', res.ok ? 'ok' : 'fail', res.ok ? `dims≈${dims ?? '?'}` : `HTTP ${res.status}`)
  } catch (err) {
    record('HuggingFace (embed)', 'fail', err.message)
  }
}

async function testVoyageEmbed() {
  if (!hasValue(config.search.voyageApiKey)) return record('Voyage (embed)', 'skip')
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.search.voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: ['test'], model: 'voyage-3-lite' }),
    })
    const data = await res.json().catch(() => ({}))
    record('Voyage (embed)', res.ok ? 'ok' : 'fail', res.ok ? `dims=${data?.data?.[0]?.embedding?.length ?? '?'}` : `HTTP ${res.status}`)
  } catch (err) {
    record('Voyage (embed)', 'fail', err.message)
  }
}

async function testVoyageRerank() {
  if (!hasValue(config.search.voyageApiKey)) return record('Voyage (rerank)', 'skip')
  const model = config.search.rerank.model
  try {
    const res = await fetch('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.search.voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        query: 'cricket bat',
        documents: ['MRF cricket bat', 'Winter jacket'],
        top_k: 2,
      }),
    })
    record('Voyage (rerank)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Voyage (rerank)', 'fail', err.message)
  }
}

async function testJinaEmbed() {
  if (!hasValue(config.search.jinaApiKey)) return record('Jina (embed)', 'skip')
  try {
    const res = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.search.jinaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: ['test'],
      }),
    })
    const data = await res.json().catch(() => ({}))
    record('Jina (embed)', res.ok ? 'ok' : 'fail', res.ok ? `dims=${data?.data?.[0]?.embedding?.length ?? '?'}` : `HTTP ${res.status}`)
  } catch (err) {
    record('Jina (embed)', 'fail', err.message)
  }
}

async function testJinaRerank() {
  if (!hasValue(config.search.jinaApiKey)) return record('Jina (rerank)', 'skip')
  try {
    const res = await fetch('https://api.jina.ai/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.search.jinaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-reranker-v2-base-multilingual',
        query: 'cricket bat',
        documents: ['MRF cricket bat', 'Winter jacket'],
        top_n: 2,
      }),
    })
    record('Jina (rerank)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Jina (rerank)', 'fail', err.message)
  }
}

async function testCohereRerank() {
  if (!hasValue(config.search.cohereApiKey)) return record('Cohere (rerank)', 'skip')
  try {
    const res = await fetch('https://api.cohere.com/v2/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.search.cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'rerank-v3.5',
        query: 'cricket bat',
        documents: [{ text: 'MRF cricket bat' }, { text: 'Winter jacket' }],
        top_n: 2,
      }),
    })
    record('Cohere (rerank)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Cohere (rerank)', 'fail', err.message)
  }
}

function testJwt() {
  const ok = hasValue(config.auth.jwtKey) && hasValue(config.auth.jwtRefreshKey)
  record('JWT secrets', ok ? 'ok' : 'fail', ok ? 'both set' : 'JWT_KEY or JWT_REFRESH_KEY missing')
}

logger.log('\nShopAI — API key validation\n')

testJwt()
await testMongo()
testCloudinary()
await testStripe()
await testResend()
await testBrevo()
await testOpenRouterChat()
await testOpenRouterEmbed()
await testOpenRouterRerank()
await testGeminiChat()
await testGeminiEmbed()
await testMistral()
await testGroq()
await testHuggingFaceChat()
await testHuggingFaceEmbed()
await testVoyageEmbed()
await testVoyageRerank()
await testJinaEmbed()
await testJinaRerank()
await testCohereRerank()

const failed = results.filter((r) => r.status === 'fail')
const passed = results.filter((r) => r.status === 'ok')
logger.log(`\nSummary: ${passed.length} ok, ${results.filter((r) => r.status === 'skip').length} skipped, ${failed.length} failed`)
process.exit(failed.length > 0 ? 1 : 0)
