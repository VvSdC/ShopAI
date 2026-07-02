import { useEffect, useMemo, useState } from 'react'
import {
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TruckIcon,
  LockClosedIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  changeOrderItemQty,
  clearMergeConflicts,
  getCartItemsFromLocalStorageAction,
  removeOrderItemQty,
  validateCartAction,
} from '../../../redux/slices/cart/cartSlices'
import { applyCartCouponAction } from '../../../redux/slices/cart/cartSlices'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import SuccessMsg from '../../SuccessMsg/SuccessMsg'
import {
  formatPrice,
  DeliveryProgress,
  ProductDescriptionSnippet,
  StockStatusBadge,
  CheckoutTableHeader,
  CheckoutProductMeta,
} from './cartDisplay'

function QtyStepper({ value, max, onChange, disabled, compact = false }) {
  const qty = Number(value) || 1
  const parsedMax = Number(max)
  const limit =
    Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : Math.max(qty, 99)
  const btnClass = compact
    ? 'flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center'
    : 'flex h-9 w-9 touch-manipulation items-center justify-center sm:h-10 sm:w-10 sm:min-h-[40px] sm:min-w-[40px]'

  const handleChange = (nextQty) => {
    if (disabled) return
    onChange(nextQty)
  }

  return (
    <div
      className={`relative z-10 inline-flex items-center rounded-md border border-stone-300 bg-white shadow-sm ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        disabled={disabled || qty <= 1}
        onClick={() => handleChange(qty - 1)}
        className={`${btnClass} rounded-l-md text-stone-600 hover:bg-stone-50 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40`}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span
        className={`border-x border-stone-300 bg-stone-50 text-center font-medium text-stone-900 ${
          compact ? 'min-w-[2.5rem] px-1 text-sm' : 'min-w-[2.5rem] px-2 text-sm'
        }`}
      >
        {qty}
      </span>
      <button
        type="button"
        disabled={disabled || qty >= limit}
        onClick={() => handleChange(qty + 1)}
        className={`${btnClass} rounded-r-md text-stone-600 hover:bg-stone-50 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40`}
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function CartItemActions({ product, onRemove }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <StockStatusBadge product={product} />
      <button
        type="button"
        onClick={onRemove}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
      >
        Delete
      </button>
    </div>
  )
}

function CartLineItem({ product, onQtyChange, onRemove }) {
  const isUnavailable = product.unavailable
  const productPath = `/products/${product._id}`

  if (isUnavailable) {
    return (
      <li className="border-b border-stone-200 bg-stone-50/80 px-4 py-5 last:border-0 sm:px-6">
        <div className="flex gap-4 opacity-70">
          <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full rounded-lg border border-stone-200 object-cover grayscale"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-stone-900/55 text-center text-[10px] font-bold uppercase tracking-wide text-white">
              Unavailable
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium capitalize text-stone-900">{product.name}</p>
            {product.reason && (
              <p className="mt-2 text-sm text-red-700">{product.reason}</p>
            )}
            <CartItemActions product={product} onRemove={onRemove} />
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="border-b border-stone-200 last:border-0">
      {/* Mobile / tablet card */}
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CheckoutProductMeta product={product} productPath={productPath} />
              </div>
              <button
                type="button"
                onClick={onRemove}
                className="shrink-0 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Remove"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <ProductDescriptionSnippet
              description={product.description}
              productPath={productPath}
              className="mt-2 sm:hidden"
            />
            <div className="mt-4 flex flex-col gap-4 border-t border-stone-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-stone-500">Price</p>
                <p className="text-sm font-semibold text-stone-900">{formatPrice(product.price)}</p>
              </div>
              <div className="flex items-end justify-between gap-4 sm:block">
                <div>
                  <p className="mb-1 text-xs text-stone-500">Qty</p>
                  <QtyStepper
                    value={product.qty}
                    max={product.qtyLeft}
                    onChange={onQtyChange}
                    compact
                  />
                </div>
                <div className="text-right sm:mt-0">
                  <p className="text-xs text-stone-500">Subtotal</p>
                  <p className="text-base font-bold text-stone-900">
                    {formatPrice(product.totalPrice)}
                  </p>
                </div>
              </div>
            </div>
            <CartItemActions product={product} onRemove={onRemove} />
          </div>
        </div>
      </div>

      {/* Desktop table row */}
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
            <CheckoutProductMeta product={product} productPath={productPath} />
            <CartItemActions product={product} onRemove={onRemove} />
          </div>
        </div>
        <div className="col-span-2 text-right">
          <span className="text-base text-stone-900">{formatPrice(product.price)}</span>
        </div>
        <div className="col-span-2 flex justify-center">
          <QtyStepper
            value={product.qty}
            max={product.qtyLeft}
            onChange={onQtyChange}
          />
        </div>
        <div className="col-span-2 text-right">
          <span className="text-lg font-bold text-stone-900">
            {formatPrice(product.totalPrice)}
          </span>
        </div>
      </div>
    </li>
  )
}

function OrderSummary({
  subtotal,
  discountAmount,
  total,
  itemCount,
  couponCode,
  setCouponCode,
  onApplyCoupon,
  couponLoading,
  couponError,
  couponSuccess,
  canCheckout,
  showCheckout = true,
  isLoggedIn = true,
  idPrefix = 'cart',
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
        <h2 className="text-lg font-bold text-stone-900">Order summary</h2>
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
              <dt>Promotional discount</dt>
              <dd className="font-medium">−{formatPrice(discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-3">
            <dt className="text-base font-bold text-stone-900">Order total</dt>
            <dd className="text-xl font-bold text-stone-900">{formatPrice(total)}</dd>
          </div>
        </dl>

        {showCheckout && (
          isLoggedIn ? (
            <Link
              to="/order-payment"
              state={{ sumTotalPrice: total }}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-base font-bold shadow-sm transition ${
                canCheckout
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'pointer-events-none bg-stone-300 text-stone-500'
              }`}
            >
              <LockClosedIcon className="h-5 w-5" />
              Proceed to checkout
            </Link>
          ) : (
            <Link
              to="/login"
              state={{ from: { pathname: '/order-payment' }, sumTotalPrice: total }}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-base font-bold shadow-sm transition ${
                canCheckout
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'pointer-events-none bg-stone-300 text-stone-500'
              }`}
            >
              <LockClosedIcon className="h-5 w-5" />
              Sign in to checkout
            </Link>
          )
        )}

        {!isLoggedIn && showCheckout && (
          <p className="text-center text-xs text-stone-500">
            Your cart is saved on this device. Create an account or sign in only when you are ready to pay.
          </p>
        )}

        <Link
          to="/products-filters"
          className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          Continue shopping
        </Link>

        <form
          onSubmit={onApplyCoupon}
          className="border-t border-stone-200 pt-4"
        >
          <label
            htmlFor={`${idPrefix}-coupon`}
            className="text-sm font-semibold text-stone-800"
          >
            Have a coupon?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={`${idPrefix}-coupon`}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              type="text"
              placeholder="Enter code"
              className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={couponLoading}
              className="shrink-0 rounded-md border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-200 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {couponError && (
            <div className="mt-2">
              <ErrorMsg message={couponError?.message} />
            </div>
          )}
          {couponSuccess && (
            <div className="mt-2">
              <SuccessMsg message={couponSuccess} />
            </div>
          )}
        </form>

        <ul className="space-y-2 border-t border-stone-200 pt-4 text-xs text-stone-600">
          <li className="flex items-start gap-2">
            <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            Safe and secure payments
          </li>
          <li className="flex items-start gap-2">
            <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            Fast dispatch after order confirmation
          </li>
        </ul>
      </div>
    </div>
  )
}

export default function ShoppingCart() {
  const dispatch = useDispatch()
  const [couponInput, setCouponInput] = useState('')

  useEffect(() => {
    dispatch(validateCartAction())
  }, [dispatch])

  const applyCouponSubmit = (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    dispatch(applyCartCouponAction(couponInput.trim()))
    setCouponInput('')
  }

  const { coupon, loading: couponLoading, error: couponError, isAdded } = useSelector(
    (state) => state?.coupons
  )
  const { cartItems, stockWarnings, priceWarnings, mergeConflicts, validating } = useSelector(
    (state) => state?.carts
  )
  const isLoggedIn = useSelector((state) => state?.users?.userAuth?.isLoggedIn)

  const availableItems = cartItems?.filter((item) => !item.unavailable) || []
  const hasUnavailable = cartItems?.some((item) => item.unavailable)
  const itemCount = availableItems.reduce((acc, item) => acc + (item.qty || 0), 0)
  const lineCount = cartItems?.length || 0

  const subtotal = useMemo(
    () => availableItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0),
    [availableItems]
  )

  const discountPercent = coupon?.coupon?.discount || 0
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0
  const total = subtotal - discountAmount

  const changeOrderItemQtyHandler = (productId, color, size, qty) => {
    dispatch(changeOrderItemQty({ productId, color, size, qty }))
  }

  const removeOrderItemQtyHandler = (productId, color, size) => {
    dispatch(removeOrderItemQty({ productId, color, size }))
  }

  const removeAllUnavailable = () => {
    cartItems
      .filter((item) => item.unavailable)
      .forEach((item) => {
        dispatch(removeOrderItemQty({ productId: item._id, color: item.color, size: item.size }))
      })
    setTimeout(() => dispatch(getCartItemsFromLocalStorageAction()), 100)
  }

  const couponSuccessMessage =
    isAdded && coupon?.coupon?.discount
      ? `Coupon applied — ${coupon.coupon.discount}% off`
      : null

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] bg-white">
        <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
            <ShoppingBagIcon className="h-10 w-10 text-stone-400" />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">Your cart is empty</h1>
          <p className="mt-2 text-stone-600">
            Looks like you haven&apos;t added anything yet. Explore our store and find something you
            love.
          </p>
          <Link
            to="/products-filters"
            className="mt-8 inline-flex rounded-lg bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white pb-28 lg:pb-10">
      {/* Top bar — breadcrumb + title */}
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-stone-500">
            <Link to="/" className="hover:text-indigo-600">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-stone-800">Shopping Cart</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Shopping Cart</h1>
              <p className="mt-1 text-sm text-stone-600">
                {lineCount} {lineCount === 1 ? 'product' : 'products'} in your cart
                {itemCount > 0 && (
                  <span className="text-stone-400">
                    {' '}
                    · {itemCount} {itemCount === 1 ? 'unit' : 'units'} available
                  </span>
                )}
              </p>
            </div>
            <div className="hidden text-right lg:block">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Cart subtotal
              </p>
              <p className="text-2xl font-bold text-indigo-700">{formatPrice(total)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          to="/products-filters"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 lg:hidden"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Continue shopping
        </Link>

        {mergeConflicts?.length > 0 && (
          <div className="mt-4 rounded-lg border border-sky-300 bg-sky-50 p-4 lg:mt-0">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-sky-700" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-sky-950">Cart synced with your account</p>
                <p className="mt-1 text-sky-900/90">
                  Items only on this device were added. Where the same product variant existed in
                  both places, your account cart quantity was kept.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sky-900/90">
                  {mergeConflicts.map((w, i) => (
                    <li key={i}>
                      <span className="font-medium capitalize">{w.name}</span> ({w.color}, {w.size}) —{' '}
                      {w.reason}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => dispatch(clearMergeConflicts())}
                  className="mt-3 font-semibold text-sky-950 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {priceWarnings?.length > 0 && (
          <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4 lg:mt-0">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-blue-900">Prices updated to match the catalog</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-blue-900/90">
                  {priceWarnings.map((w, i) => (
                    <li key={i}>
                      <span className="font-medium capitalize">{w.name}</span> — {w.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {stockWarnings?.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 lg:mt-0">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-900">Some items were updated</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-900/90">
                  {stockWarnings.map((w, i) => (
                    <li key={i}>
                      <span className="font-medium capitalize">{w.name}</span> — {w.reason}
                    </li>
                  ))}
                </ul>
                {hasUnavailable && (
                  <button
                    type="button"
                    onClick={removeAllUnavailable}
                    className="mt-3 font-semibold text-amber-900 underline hover:no-underline"
                  >
                    Remove unavailable items
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {validating ? (
          <div className="py-20">
            <LoadingComponent />
          </div>
        ) : (
          <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
            {/* Cart items — left column */}
            <section aria-labelledby="cart-heading" className="lg:col-span-8">
              <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-6">
                  <h2 id="cart-heading" className="text-base font-bold text-stone-900">
                    Cart items
                  </h2>
                  <span className="text-sm text-stone-500">Price</span>
                </div>
                <CheckoutTableHeader />
                <ul className="divide-y divide-stone-200">
                  {cartItems.map((product) => (
                    <CartLineItem
                      key={`${product._id}-${product.color}-${product.size}`}
                      product={product}
                      onQtyChange={(qty) =>
                        changeOrderItemQtyHandler(
                          product._id,
                          product.color,
                          product.size,
                          qty
                        )
                      }
                      onRemove={() =>
                        removeOrderItemQtyHandler(product._id, product.color, product.size)
                      }
                    />
                  ))}
                </ul>
              </div>

              <p className="mt-4 hidden text-xs text-stone-500 lg:block">
                The price and availability of items at ShopAI are subject to change. The cart is a
                temporary place to store a list of your items.
              </p>
            </section>

            {/* Order summary — right sticky column */}
            <aside className="mt-8 lg:col-span-4 lg:mt-0">
              <div
                className="lg:sticky"
                style={{ top: 'calc(var(--shopai-navbar-height, 5rem) + 1rem)' }}
              >
                <OrderSummary
                  subtotal={subtotal}
                  discountAmount={discountAmount}
                  total={total}
                  itemCount={itemCount}
                  couponCode={couponInput}
                  setCouponCode={setCouponInput}
                  onApplyCoupon={applyCouponSubmit}
                  couponLoading={couponLoading}
                  couponError={couponError}
                  couponSuccess={couponSuccessMessage}
                  canCheckout={availableItems.length > 0}
                  showCheckout
                  isLoggedIn={isLoggedIn}
                  idPrefix="desktop"
                />
              </div>
            </aside>
          </div>
        )}

        {availableItems.length === 0 && !validating && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
            No items available for checkout. Remove or replace unavailable products above.
          </p>
        )}
      </div>

      {/* Mobile sticky checkout */}
      {!validating && availableItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-300 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-stone-500">
                Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </p>
              <p className="text-xl font-bold text-stone-900">{formatPrice(total)}</p>
            </div>
            <Link
              to={isLoggedIn ? '/order-payment' : '/login'}
              state={
                isLoggedIn
                  ? { sumTotalPrice: total }
                  : { from: { pathname: '/order-payment' }, sumTotalPrice: total }
              }
              className="shrink-0 rounded-lg bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
            >
              {isLoggedIn ? 'Checkout' : 'Sign in'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
