/**
 * Must load before any Zod schema modules so `.openapi()` is available.
 * Imported first from server.js, app.js, and tests/setup.js.
 */
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)
