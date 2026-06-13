import { registry } from '../schemas.js'
import {
  route,
  jsonBody,
  mongoIdParams,
  userSecurity,
  adminSecurity,
} from '../helpers.js'
import {
  LoginBody,
  RegisterBody,
  ChangePasswordBody,
  ResetPasswordBody,
} from '../schemas.js'
import { z } from 'zod'

const CSRF_NOTE =
  'Mutating requests require header `x-csrf-token` matching the `shopai_csrf` cookie. Fetch a token from GET /shopai/users/csrf-token first.'

export function registerAuthPaths() {
  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/login',
      tags: ['Auth'],
      summary: 'Login',
      description: CSRF_NOTE,
      request: { body: jsonBody(LoginBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/register',
      tags: ['Auth'],
      summary: 'Register',
      description: CSRF_NOTE,
      request: { body: jsonBody(RegisterBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/users/csrf-token',
      tags: ['Auth'],
      summary: 'Get CSRF token',
      description: 'Sets `shopai_csrf` cookie and returns the token for use in `x-csrf-token`.',
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/refresh',
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: `Uses \`shopai_refresh\` cookie. ${CSRF_NOTE}`,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/logout',
      tags: ['Auth'],
      summary: 'Logout',
      description: CSRF_NOTE,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/forgot-password',
      tags: ['Auth'],
      summary: 'Request password reset OTP',
      request: {
        body: jsonBody(
          z.object({ email: z.string().email() }).openapi('ForgotPasswordBody')
        ),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/verify-otp',
      tags: ['Auth'],
      summary: 'Verify OTP',
      request: {
        body: jsonBody(
          z
            .object({ email: z.string().email(), otp: z.string().length(6) })
            .openapi('VerifyOtpBody')
        ),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/users/reset-password',
      tags: ['Auth'],
      summary: 'Reset password with OTP',
      request: { body: jsonBody(ResetPasswordBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/users/change-password',
      tags: ['Auth'],
      summary: 'Change password',
      security: userSecurity,
      request: { body: jsonBody(ChangePasswordBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/users/me',
      tags: ['Users'],
      summary: 'Current user',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/users/profile',
      tags: ['Users'],
      summary: 'User profile',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/users/update/profile',
      tags: ['Users'],
      summary: 'Update profile',
      security: userSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/users/all',
      tags: ['Users', 'Admin'],
      summary: 'List all users',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/users/update/shipping',
      tags: ['Users'],
      summary: 'Add shipping address',
      security: userSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/users/update/shipping/{addressId}',
      tags: ['Users'],
      summary: 'Update shipping address',
      security: userSecurity,
      request: {
        params: mongoIdParams('addressId'),
        body: jsonBody(z.object({}).passthrough()),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/users/update/shipping/{addressId}',
      tags: ['Users'],
      summary: 'Delete shipping address',
      security: userSecurity,
      request: { params: mongoIdParams('addressId') },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/users/block/{id}',
      tags: ['Users', 'Admin'],
      summary: 'Block user',
      security: adminSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/users/delete-account',
      tags: ['Users'],
      summary: 'Delete own account',
      security: userSecurity,
    })
  )
}
