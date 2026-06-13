import { registerAuthPaths } from './auth.js'
import { registerCatalogPaths } from './catalog.js'
import { registerCommercePaths } from './commerce.js'
import {
  registerSocialPaths,
  registerAdminPaths,
  registerSystemPaths,
} from './social.js'

registerAuthPaths()
registerCatalogPaths()
registerCommercePaths()
registerSocialPaths()
registerAdminPaths()
registerSystemPaths()
