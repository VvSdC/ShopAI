import User from '../model/User.js'

/** Revoke all refresh-token sessions for a user (e.g. after password change). */
export async function invalidateUserRefreshToken(userOrId) {
  if (!userOrId) return

  if (typeof userOrId === 'object' && userOrId._id) {
    userOrId.refreshToken = ''
    await userOrId.save()
    return
  }

  await User.findByIdAndUpdate(userOrId, { refreshToken: '' })
}

export function clearAuthCookies(res) {
  res.clearCookie('shopai_token')
  res.clearCookie('shopai_refresh_token')
}
