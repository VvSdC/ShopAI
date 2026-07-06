/**
 * Export OpenAPI spec to Backend/docs/openapi.json for CI / client codegen.
 * Usage: node scripts/export-openapi.js
 */
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import '../openapi/initZodOpenApi.js'
import { buildOpenApiDocument } from '../openapi/index.js'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'docs', 'openapi.json')

const doc = buildOpenApiDocument()
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
logger.log(`Wrote ${outPath} (${doc.paths ? Object.keys(doc.paths).length : 0} paths)`)
