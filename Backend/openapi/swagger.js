import swaggerUi from 'swagger-ui-express'
import { buildOpenApiDocument } from './index.js'

/**
 * @param {import('express').Express} app
 * @param {{ serverUrl?: string }} [options]
 */
export function mountOpenApi(app, options = {}) {
  const spec = buildOpenApiDocument(options)

  app.get('/shopai/openapi.json', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json(spec)
  })

  app.use(
    '/shopai/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'ShopAI API',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    })
  )
}
