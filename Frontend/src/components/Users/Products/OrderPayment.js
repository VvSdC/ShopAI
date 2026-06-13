import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { validateCartAction } from '../../../redux/slices/cart/cartSlices'
import { placeOrderAction } from '../../../redux/slices/orders/ordersSlices'
import { getUserProfileAction } from '../../../redux/slices/users/usersSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import AddShippingAddress from '../Forms/AddShippingAddress'
import {
  formatPrice,
  DeliveryProgress,
  StockStatusBadge,
  CheckoutTableHeader,
  CheckoutProductMeta,
} from './cartDisplay'

function CheckoutLineItem({ product }) {
  const productPath = `/products/${product._id}`

  return (
    <li className="border-b border-stone-200 last:border-0">
      {/* Mobile */}
      <div className="px-4 py-5 sm:px-6 lg:hidden">
        <div className="flex gap-4">
          <Link to={productPath} className="shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="h-24 w-24 rounded-lg border border-stone-200 object-cover sm:h-28 sm:w-28"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <CheckoutProductMeta
              product={product}
              productPath={productPath}
              showDescription={false}
            />
            <div className="mt-3">
              <StockStatusBadge product={product} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-sm">
              <div>
                <p className="text-xs text-stone-500">Price</p>
                <p className="font-semibold text-stone-900">{formatPrice(product.price)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Qty</p>
                <p className="font-semibold text-stone-900">{product.qty}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-500">Subtotal</p>
                <p className="text-base font-bold text-stone-900">
                  {formatPrice(product.totalPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden px-6 py-5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-4">
        <div className="col-span-6 flex gap-4">
          <Link to={productPath} className="shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="h-28 w-28 rounded-lg border border-stone-200 object-cover"
            />
          </Link>
          <div className="min-w-0 flex-1 py-1">
            <CheckoutProductMeta
              product={product}
              productPath={productPath}
              showDescription={false}
            />
            <div className="mt-3">
              <StockStatusBadge product={product} />
            </div>
          </div>
        </div>
        <div className="col-span-2 text-right text-base text-stone-900">
          {formatPrice(product.price)}
        </div>
        <div className="col-span-2 text-center text-base font-medium text-stone-900">
          {product.qty}
        </div>
        <div className="col-span-2 text-right text-lg font-bold text-stone-900">
          {formatPrice(product.totalPrice)}
        </div>
      </div>
    </li>
  )
}

export default function OrderPayment() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(validateCartAction())
    dispatch(getUserProfileAction())
  }, [dispatch])

  const { cartItems, stockWarnings, validating } = useSelector((state) => state?.carts)
  const { coupon: appliedCoupon } = useSelector((state) => state?.coupons)
  const { loading: orderLoading, error: orderErr } = useSelector((state) => state?.orders)

  const availableItems = cartItems?.filter((item) => !item.unavailable) || []
  const unavailableCount = (cartItems?.length || 0) - availableItems.length

  const subtotal = useMemo(
    () => availableItems.reduce((acc, item) => acc + (item?.totalPrice || 0), 0),
    [availableItems]
  )

  const discountPercent = appliedCoupon?.coupon?.discount || 0
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0
  const total = subtotal - discountAmount
  const itemCount = availableItems.reduce((acc, item) => acc + (item.qty || 0), 0)

  const [selectedAddress, setSelectedAddress] = useState(null)
  const [addressError, setAddressError] = useState('')
  const [checkoutBlocked, setCheckoutBlocked] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState('')

  const handleAddressSelect = useCallback((addr) => {
    setSelectedAddress(addr)
    setAddressError('')
  }, [])

  const placeOrderHandler = async () => {
    if (!selectedAddress) {
      setAddressError('Please select a delivery address to continue')
      return
    }
    if (availableItems.length === 0) {
      setAddressError('No available items to order. Update your cart first.')
      return
    }
    setAddressError('')
    setCheckoutBlocked(false)
    setCheckoutUrl('')

    try {
      const result = await dispatch(
        placeOrderAction({
          shippingAddress: selectedAddress,
          orderItems: availableItems,
          totalPrice: total,
        })
      ).unwrap()

      if (result?.url) {
        const checkoutWindow = window.open(result.url, '_blank', 'noopener,noreferrer')
        if (!checkoutWindow) {
          setCheckoutUrl(result.url)
          setCheckoutBlocked(true)
        }
      }
    } catch {
      // Order errors surface via orderErr from Redux
    }
  }

  return (
    <>
      {orderErr && <ErrorMsg message={orderErr} />}

      {addressError && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-stone-900/40"
            onClick={() => setAddressError('')}
            aria-hidden
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">Required</h3>
              <p className="mt-2 text-sm text-stone-600">{addressError}</p>
              <button
                type="button"
                onClick={() => setAddressError('')}
                className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutBlocked && checkoutUrl && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Pop-up blocked</p>
            <p className="mt-1">
              Your browser blocked the Stripe checkout window.{' '}
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-700 underline hover:text-indigo-900"
              >
                Open checkout in a new tab
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="bg-white pb-28 lg:pb-10">
        <div className="border-b border-stone-200 bg-stone-50">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <nav className="text-xs text-stone-500">
              <Link to="/" className="hover:text-indigo-600">
                Home
              </Link>
              <span className="mx-2">›</span>
              <Link to="/shopping-cart" className="hover:text-indigo-600">
                Cart
              </Link>
              <span className="mx-2">›</span>
              <span className="font-medium text-stone-800">Checkout</span>
            </nav>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Checkout</h1>
                <p className="mt-1 text-sm text-stone-600">
                  Review your order and choose a delivery address
                </p>
              </div>
              <div className="hidden text-right lg:block">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Order total
                </p>
                <p className="text-2xl font-bold text-indigo-700">{formatPrice(total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Link
            to="/shopping-cart"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to cart
          </Link>

          {unavailableCount > 0 && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {unavailableCount} {unavailableCount === 1 ? 'item' : 'items'} in your cart are not
                available and will not be included in this order.{' '}
                <Link to="/shopping-cart" className="underline hover:no-underline">
                  Update cart
                </Link>
              </p>
            </div>
          )}

          {stockWarnings?.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600" />
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-900">
                  {stockWarnings.map((w, i) => (
                    <li key={i}>
                      <span className="font-medium capitalize">{w.name}</span> — {w.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {validating ? (
            <div className="py-20">
              <LoadingComponent />
            </div>
          ) : (
            <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
              {/* Delivery address */}
              <section className="lg:col-span-5">
                <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                  <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
                    <h2 className="text-lg font-bold text-stone-900">Delivery address</h2>
                    <p className="mt-0.5 text-sm text-stone-500">
                      Select where you want your order delivered
                    </p>
                  </div>
                  <div className="p-5 sm:p-6">
                    <AddShippingAddress onAddressSelect={handleAddressSelect} />
                  </div>
                </div>
              </section>

              {/* Order summary */}
              <aside className="mt-8 lg:col-span-7 lg:mt-0">
                <div
                  className="lg:sticky"
                  style={{ top: 'calc(var(--shopai-navbar-height, 5rem) + 1rem)' }}
                >
                  <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                    <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
                      <h2 className="text-lg font-bold text-stone-900">Order summary</h2>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    <div className="border-b border-stone-200">
                      <CheckoutTableHeader />
                      {availableItems.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-stone-500">
                          No items available.{' '}
                          <Link to="/shopping-cart" className="font-medium text-indigo-600">
                            Return to cart
                          </Link>
                        </p>
                      ) : (
                        <ul className="divide-y divide-stone-200">
                          {availableItems.map((product) => (
                            <CheckoutLineItem
                              key={`${product._id}-${product.color}-${product.size}`}
                              product={product}
                            />
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-4 p-5">
                      <DeliveryProgress subtotal={subtotal} />

                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between text-stone-600">
                          <dt>
                            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                          </dt>
                          <dd className="font-medium text-stone-900">{formatPrice(subtotal)}</dd>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <dt>Coupon ({appliedCoupon?.coupon?.code})</dt>
                            <dd className="font-medium">−{formatPrice(discountAmount)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-stone-200 pt-3">
                          <dt className="text-base font-bold text-stone-900">Order total</dt>
                          <dd className="text-xl font-bold text-stone-900">{formatPrice(total)}</dd>
                        </div>
                      </dl>

                      {orderLoading ? (
                        <LoadingComponent />
                      ) : (
                        <button
                          type="button"
                          onClick={placeOrderHandler}
                          disabled={availableItems.length === 0}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3.5 text-base font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                        >
                          <LockClosedIcon className="h-5 w-5" />
                          Pay {formatPrice(total)}
                        </button>
                      )}

                      <Link
                        to="/shopping-cart"
                        className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Edit cart
                      </Link>

                      <ul className="space-y-2 border-t border-stone-200 pt-4 text-xs text-stone-600">
                        <li className="flex items-start gap-2">
                          <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                          Secure payment via Stripe
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        {!validating && availableItems.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-300 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-stone-500">Total</p>
                <p className="text-xl font-bold text-stone-900">{formatPrice(total)}</p>
              </div>
              <button
                type="button"
                onClick={placeOrderHandler}
                disabled={orderLoading}
                className="shrink-0 rounded-lg bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Pay now
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
