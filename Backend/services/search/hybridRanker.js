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

export function applyRerankOrder(productIds, rerankedIndices, candidates) {
  if (!rerankedIndices?.length) return productIds

  const idByIndex = candidates.map((p) => String(p._id))
  const rerankedIds = rerankedIndices.map((i) => idByIndex[i]).filter(Boolean)
  const rerankedSet = new Set(rerankedIds)
  const tail = productIds.filter((id) => !rerankedSet.has(String(id)))
  return [...rerankedIds, ...tail]
}
