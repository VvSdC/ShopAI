import logger from '../utils/logger.js'
import {
  getAppRedisClient,
  isAppRedisReady,
  shutdownAppRedisClient,
} from '../config/redisClient.js'

/** SCAN + DEL by prefix in one Redis round-trip (ARGV[1]=prefix, ARGV[2]=SCAN COUNT). */
export const DELETE_BY_PREFIX_SCRIPT = `
local cursor = "0"
local prefix = ARGV[1]
local scanCount = tonumber(ARGV[2]) or 100
local deleted = 0
repeat
  local result = redis.call("SCAN", cursor, "MATCH", prefix .. "*", "COUNT", scanCount)
  cursor = result[1]
  local keys = result[2]
  for i = 1, #keys do
    deleted = deleted + redis.call("DEL", keys[i])
  end
until cursor == "0"
return deleted
`

const DELETE_BY_PREFIX_SCAN_COUNT = 100

let deleteByPrefixScriptSha = null

async function evalDeleteByPrefix(redis, prefix) {
  if (!deleteByPrefixScriptSha) {
    deleteByPrefixScriptSha = await redis.script('LOAD', DELETE_BY_PREFIX_SCRIPT)
  }

  try {
    return await redis.evalsha(
      deleteByPrefixScriptSha,
      0,
      prefix,
      String(DELETE_BY_PREFIX_SCAN_COUNT)
    )
  } catch (err) {
    if (String(err?.message || '').includes('NOSCRIPT')) {
      deleteByPrefixScriptSha = null
      deleteByPrefixScriptSha = await redis.script('LOAD', DELETE_BY_PREFIX_SCRIPT)
      return redis.evalsha(
        deleteByPrefixScriptSha,
        0,
        prefix,
        String(DELETE_BY_PREFIX_SCAN_COUNT)
      )
    }
    throw err
  }
}

export function resetDeleteByPrefixScriptCache() {
  deleteByPrefixScriptSha = null
}

export function isAvailable() {
  return isAppRedisReady()
}

async function ensureClient() {
  return getAppRedisClient()
}

export async function get(key) {
  const redis = await ensureClient()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    if (raw == null) return null
    return JSON.parse(raw)
  } catch (err) {
    logger.warn(`[cache] get ${key} failed:`, err.message)
    return null
  }
}

export async function set(key, value, ttlSeconds) {
  const redis = await ensureClient()
  if (!redis) return false
  try {
    const payload = JSON.stringify(value)
    if (ttlSeconds > 0) {
      await redis.set(key, payload, 'EX', ttlSeconds)
    } else {
      await redis.set(key, payload)
    }
    return true
  } catch (err) {
    logger.warn(`[cache] set ${key} failed:`, err.message)
    return false
  }
}

export async function del(...keys) {
  const redis = await ensureClient()
  if (!redis || keys.length === 0) return 0
  try {
    return await redis.del(...keys.flat().filter(Boolean))
  } catch (err) {
    logger.warn('[cache] del failed:', err.message)
    return 0
  }
}

export async function delByPrefix(prefix) {
  const redis = await ensureClient()
  if (!redis || !prefix) return 0

  try {
    const removed = await evalDeleteByPrefix(redis, prefix)
    return Number(removed) || 0
  } catch (err) {
    logger.warn(`[cache] delByPrefix ${prefix} failed:`, err.message)
    return 0
  }
}

export async function shutdownCache() {
  await shutdownAppRedisClient()
}
