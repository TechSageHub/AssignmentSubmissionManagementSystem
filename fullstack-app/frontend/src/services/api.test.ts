import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readApiCache, writeApiCache, clearApiCache } from './api'

describe('api cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearApiCache()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearApiCache()
  })

  it('returns null when nothing is cached', () => {
    expect(readApiCache('/x')).toBeNull()
  })

  it('round-trips cached GET data', () => {
    writeApiCache('/users', [{ id: 1 }])
    expect(readApiCache<{ id: number }[]>('/users')).toEqual([{ id: 1 }])
  })

  it('expires entries after 60 seconds', () => {
    writeApiCache('/users', [1])
    vi.advanceTimersByTime(59_000)
    expect(readApiCache('/users')).toEqual([1])
    vi.advanceTimersByTime(1_100)
    expect(readApiCache('/users')).toBeNull()
  })

  it('keys include serialized query params', () => {
    writeApiCache('/users', [1], { limit: 20 })
    expect(readApiCache('/users', { limit: 20 })).toEqual([1])
    expect(readApiCache('/users')).toBeNull()
  })

  it('clearApiCache removes a matching prefix or everything', () => {
    writeApiCache('/users?limit=20', [1])
    writeApiCache('/users?limit=5', [2])
    writeApiCache('/stats', 3)

    clearApiCache('/users')
    expect(readApiCache('/users?limit=20')).toBeNull()
    expect(readApiCache('/users?limit=5')).toBeNull()
    expect(readApiCache('/stats')).toEqual(3)

    clearApiCache()
    expect(readApiCache('/stats')).toBeNull()
  })
})