import Brand from '../../model/Brand.js'
import User from '../../model/User.js'

export async function createTestBrand(name, user) {
  const owner =
    user ||
    (await User.create({
      fullname: 'Brand Helper User',
      email: `brand-helper-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
    }))

  return Brand.create({
    name: String(name).toLowerCase(),
    user: owner._id,
  })
}
