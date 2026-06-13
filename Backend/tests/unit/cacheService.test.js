import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getAppRedisClient, scriptLoad, evalsha } = vi.hoisted(() => ({
  getAppRedisClient: vi.fn(),
  scriptLoad: vi.fn(),
  evalsha: vi.fn(),
}))

vi.mock('../../config/redisClient.js', () => ({
  getAppRedisClient,
  isAppRedisReady: vi.fn(() => true),
  shutdownAppRedisClient: vi.fn(),
}))

import {
  delByPrefix,
  DELETE_BY_PREFIX_SCRIPT,
  resetDeleteByPrefixScriptCache,
} from '../../services/cacheService.js'

describe('delByPrefix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDeleteByPrefixScriptCache()
    scriptLoad.mockResolvedValue('deadbeef')
    evalsha.mockResolvedValue(3)
    getAppRedisClient.mockResolvedValue({
      script: scriptLoad,
      evalsha,
    })
  })

  it('returns 0 when Redis is unavailable', async () => {
    getAppRedisClient.mockResolvedValue(null)
    await expect(delByPrefix('products:list:')).resolves.toBe(0)
    expect(scriptLoad).not.toHaveBeenCalled()
  })

  it('returns 0 for an empty prefix', async () => {
    await expect(delByPrefix('')).resolves.toBe(0)
    expect(scriptLoad).not.toHaveBeenCalled()
  })

  it('loads the Lua script once and deletes via evalsha', async () => {
    await expect(delByPrefix('products:list:')).resolves.toBe(3)
    expect(scriptLoad).toHaveBeenCalledWith('LOAD', DELETE_BY_PREFIX_SCRIPT)
    expect(evalsha).toHaveBeenCalledWith('deadbeef', 0, 'products:list:', '100')

    evalsha.mockResolvedValue(2)
    await expect(delByPrefix('products:list:')).resolves.toBe(2)
    expect(scriptLoad).toHaveBeenCalledTimes(1)
    expect(evalsha).toHaveBeenCalledTimes(2)
  })

  it('reloads the script after NOSCRIPT', async () => {
    evalsha
      .mockRejectedValueOnce(new Error('NOSCRIPT No matching script'))
      .mockResolvedValueOnce(5)

    scriptLoad.mockResolvedValueOnce('deadbeef').mockResolvedValueOnce('cafebabe')

    await expect(delByPrefix('search:query-embed:')).resolves.toBe(5)
    expect(scriptLoad).toHaveBeenCalledTimes(2)
    expect(evalsha).toHaveBeenNthCalledWith(
      2,
      'cafebabe',
      0,
      'search:query-embed:',
      '100'
    )
  })

  it('returns 0 and logs when evalsha fails', async () => {
    evalsha.mockRejectedValue(new Error('READONLY'))
    await expect(delByPrefix('products:list:')).resolves.toBe(0)
  })
})
