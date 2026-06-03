const DEFAULT_K = 60

export function reciprocalRankFusion(lists, k = DEFAULT_K) {
  const scores = new Map()

  for (const list of lists) {
    list.forEach((id, rank) => {
      const key = String(id)
      scores.set(key, (scores.get(key) || 0) + 1 / (k + rank + 1))
    })
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

/** Return only reranked product IDs (no unranked tail — avoids irrelevant matches after top results). */
export function applyRerankOrder(productIds, rerankedIndices, candidates) {
  if (!rerankedIndices?.length) return productIds

  const idByIndex = candidates.map((p) => String(p._id))
  return rerankedIndices.map((i) => idByIndex[i]).filter(Boolean)
}
