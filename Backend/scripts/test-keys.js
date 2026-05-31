/**
 * Validates configured API keys (reads Backend/.env). Does not print secret values.
 * Usage: node scripts/test-keys.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Stripe from 'stripe'
import { v2 as cloudinary } from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const results = []

function record(name, status, detail = '') {
  results.push({ name, status, detail })
  const icon = status === 'ok' ? 'OK' : status === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ''}`)
}

function has(key) {
  const v = process.env[key]
  return v !== undefined && String(v).trim() !== ''
}

async function testMongo() {
  if (!has('MONGO_URL')) return record('MongoDB', 'fail', 'MONGO_URL missing')
  try {
    await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 8000 })
    await mongoose.connection.db.admin().command({ ping: 1 })
    record('MongoDB', 'ok', mongoose.connection.host)
  } catch (err) {
    record('MongoDB', 'fail', err.message)
  } finally {
    await mongoose.disconnect().catch(() => {})
  }
}

async function testStripe() {
  if (!has('STRIPE_KEY')) return record('Stripe', 'skip', 'STRIPE_KEY not set')
  try {
    const stripe = new Stripe(process.env.STRIPE_KEY)
    await stripe.balance.retrieve()
    record('Stripe', 'ok')
  } catch (err) {
    record('Stripe', 'fail', err.message)
  }
}

function testCloudinary() {
  if (!has('CLOUDINARY_CLOUD_NAME') || !has('CLOUDINARY_API_KEY') || !has('CLOUDINARY_API_SECRET_KEY')) {
    return record('Cloudinary', 'skip', 'keys incomplete')
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
  })
  try {
    const sig = cloudinary.utils.api_sign_request({ timestamp: Math.floor(Date.now() / 1000) }, process.env.CLOUDINARY_API_SECRET_KEY)
    record('Cloudinary', sig ? 'ok' : 'fail', 'sign check')
  } catch (err) {
    record('Cloudinary', 'fail', err.message)
  }
}

async function testResend() {
  if (!has('RESEND_API_KEY')) return record('Resend', 'skip')
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    record('Resend', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Resend', 'fail', err.message)
  }
}

async function testBrevo() {
  if (!has('BREVO_API_KEY')) return record('Brevo', 'skip')
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': process.env.BREVO_API_KEY },
    })
    record('Brevo', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Brevo', 'fail', err.message)
  }
}

async function testOpenRouterChat() {
  if (!has('OPENROUTER_API_KEY')) return record('OpenRouter (chat)', 'skip')
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models?output_modalities=text', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    })
    record('OpenRouter (chat)', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('OpenRouter (chat)', 'fail', err.message)
  }
}

async function testOpenRouterEmbed() {
  if (!has('OPENROUTER_API_KEY')) return record('OpenRouter (embed)', 'skip')
  const model = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small'
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
  if (!has('OPENROUTER_API_KEY')) return record('OpenRouter (rerank)', 'skip')
  const model = process.env.OPENROUTER_RERANK_MODEL || 'cohere/rerank-v3.5'
  try {
    const res = await fetch('https://openrouter.ai/api/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!key) return record('Gemini (chat)', 'skip')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
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
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!key) return record('Gemini (embed)', 'skip')
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
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
  if (!has('MISTRAL_API_KEY')) return record('Mistral', 'skip')
  try {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
    })
    record('Mistral', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Mistral', 'fail', err.message)
  }
}

async function testGroq() {
  if (!has('GROQ_API_KEY')) return record('Groq', 'skip')
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    })
    record('Groq', res.ok ? 'ok' : 'fail', res.ok ? '' : `HTTP ${res.status}`)
  } catch (err) {
    record('Groq', 'fail', err.message)
  }
}

async function testHuggingFaceChat() {
  if (!has('HUGGINGFACE_API_KEY')) return record('HuggingFace (chat)', 'skip')
  const model = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
  try {
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
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
  if (!has('HUGGINGFACE_API_KEY')) return record('HuggingFace (embed)', 'skip')
  const model = process.env.EMBEDDING_MODEL || 'BAAI/bge-m3'
  const url = `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
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
  if (!has('VOYAGE_API_KEY')) return record('Voyage (embed)', 'skip')
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
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
  if (!has('VOYAGE_API_KEY')) return record('Voyage (rerank)', 'skip')
  const model = process.env.RERANK_MODEL || 'rerank-2.5'
  try {
    const res = await fetch('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
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
  if (!has('JINA_API_KEY')) return record('Jina (embed)', 'skip')
  try {
    const res = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
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
  if (!has('JINA_API_KEY')) return record('Jina (rerank)', 'skip')
  try {
    const res = await fetch('https://api.jina.ai/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
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
  if (!has('COHERE_API_KEY')) return record('Cohere (rerank)', 'skip')
  try {
    const res = await fetch('https://api.cohere.com/v2/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
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
  const ok = has('JWT_KEY') && has('JWT_REFRESH_KEY')
  record('JWT secrets', ok ? 'ok' : 'fail', ok ? 'both set' : 'JWT_KEY or JWT_REFRESH_KEY missing')
}

console.log('\nShopAI — API key validation\n')

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
console.log(`\nSummary: ${passed.length} ok, ${results.filter((r) => r.status === 'skip').length} skipped, ${failed.length} failed`)
process.exit(failed.length > 0 ? 1 : 0)
