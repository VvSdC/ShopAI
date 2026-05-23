/**
 * Test order confirmation email delivery.
 * Usage: node scripts/test-order-email.js your@email.com
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { sendOrderConfirmationEmail } = await import('../services/emailService.js')

const to = process.argv[2]
if (!to) {
  console.error('Usage: node scripts/test-order-email.js your@email.com')
  process.exit(1)
}

const mockOrder = {
  orderNumber: 'TEST12345',
  createdAt: new Date(),
  totalPrice: 1999,
  paymentMethod: 'card',
  coupon: null,
  orderItems: [
    {
      name: 'Test Product',
      qty: 2,
      price: 999,
      totalPrice: 1998,
      color: 'Blue',
      size: 'M',
    },
  ],
  shippingAddress: {
    firstName: 'Test',
    lastName: 'User',
    address: '123 Test Street',
    city: 'Hyderabad',
    province: 'Telangana',
    postalCode: '500001',
    country: 'India',
    phone: '9876543210',
  },
}

console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER || '(auto)')
console.log('EMAIL_FROM:', (process.env.EMAIL_FROM || '').replace(/(.{2}).+(@.+)/, '$1***$2'))
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'set' : 'missing')
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'set' : 'missing')
console.log('Sending test order email to:', to)

const result = await sendOrderConfirmationEmail(to, 'Test User', mockOrder)
console.log('Result:', result)
process.exit(result.success ? 0 : 1)
