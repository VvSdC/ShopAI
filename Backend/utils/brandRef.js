import Brand from '../model/Brand.js'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Brand name for API, search scoring, and embeddings (populated doc or legacy string). */
export function brandDisplayName(brand) {
  if (!brand) return ''
  if (typeof brand === 'string') return brand
  if (typeof brand === 'object' && brand.name) return brand.name
  return ''
}

function isStrictObjectIdString(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ''))
}

/** Resolve a brand name or id string to a Brand ObjectId. */
export async function resolveBrandId(input) {
  if (input == null) return null
  const value = String(input).trim()
  if (!value) return null

  if (isStrictObjectIdString(value)) {
    const byId = await Brand.findById(value).select('_id')
    if (byId) return byId._id
  }

  const byName = await Brand.findOne({
    name: { $regex: `^${escapeRegex(value)}$`, $options: 'i' },
  }).select('_id')

  return byName?._id ?? null
}

/** Resolve many brand labels to ObjectIds (unknown names are skipped). */
export async function resolveBrandIds(inputs = []) {
  const raw = Array.isArray(inputs) ? inputs : [inputs]
  const ids = []
  for (const entry of raw) {
    const id = await resolveBrandId(entry)
    if (id) ids.push(id)
  }
  return [...new Map(ids.map((id) => [String(id), id])).values()]
}

/** Attach `{ name }` brand subdocs for lean products (ObjectIds or legacy name strings). */
export async function enrichProductsWithBrandNames(products) {
  if (!products?.length) return products

  const objectIdRefs = []
  const stringNames = []

  for (const product of products) {
    const brand = product.brand
    if (!brand) continue
    if (typeof brand === 'string') {
      const trimmed = brand.trim()
      if (trimmed) stringNames.push(trimmed)
      continue
    }
    if (typeof brand === 'object' && brand.name) continue
    const idStr = String(brand._id || brand)
    if (isStrictObjectIdString(idStr)) {
      objectIdRefs.push(idStr)
    }
  }

  const byId = new Map()
  const byNameLower = new Map()

  const uniqueIds = [...new Set(objectIdRefs)]
  if (uniqueIds.length) {
    const brands = await Brand.find({ _id: { $in: uniqueIds } }).select('name').lean()
    for (const brand of brands) byId.set(String(brand._id), brand)
  }

  const uniqueNames = [...new Set(stringNames)]
  if (uniqueNames.length) {
    const brands = await Brand.find({
      $or: uniqueNames.map((name) => ({
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
      })),
    })
      .select('name')
      .lean()
    for (const brand of brands) byNameLower.set(brand.name.toLowerCase(), brand)
  }

  return products.map((product) => {
    const brand = product.brand
    if (!brand) return product
    if (typeof brand === 'object' && brand.name) return product

    if (typeof brand === 'string') {
      const resolved = byNameLower.get(brand.toLowerCase())
      return { ...product, brand: resolved || { name: brand } }
    }

    const resolved = byId.get(String(brand._id || brand))
    return resolved ? { ...product, brand: resolved } : product
  })
}
