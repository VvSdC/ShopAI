import { useEffect, useMemo, useState } from 'react'
import {
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  changeOrderItemQty,
  getCartItemsFromLocalStorageAction,
  removeOrderItemQty,
  validateCartAction,
} from '../../../redux/slices/cart/cartSlices'
import { fetchCouponAction } from '../../../redux/slices/coupons/couponsSlice'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import SuccessMsg from '../../SuccessMsg/SuccessMsg'

const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function QtyStepper({ value, max, onChange, disabled }) {
  const qty = Number(value) || 1
  const limit = Math.max(1, Number(max) || 1)

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-stone-200 bg-white ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        disabled={disabled || qty <= 1}
        onClick={() => onChange(qty - 1)}
        className="flex h-9 w-9 items-center justify-center text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="min-w-[2rem] px-1 text-center text-sm font-semibold text-stone-900">
        {qty}
      </span>
      <button
        type="button"
        disabled={disabled || qty >= limit}
        onClick={() => onChange(qty + 1)}
        className="flex h-9 w-9 items-center justify-center text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function CartLineItem({ product, onQtyChange, onRemove }) {
  const isUnavailable = product.unavailable
  const productPath = `/products/${product._id}`

  return (
    <li
      className={`flex gap-4 border-b border-stone-100 py-4 last:border-0 sm:gap-5 sm:py-5 ${
        isUnavailable ? 'opacity-60' : ''
      }`}
    >
      <Link to={productPath} className="relative shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className={`h-20 w-20 rounded-xl border border-stone-200 object-cover sm:h-24 sm:w-24 ${
            isUnavailable ? 'grayscale' : ''
          }`}
        />
        {isUnavailable && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-stone-900/60 px-1 text-center text-[10px] font-bold uppercase text-white">
            Unavailable
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={productPath}
              className="line-clamp-2 text-sm font-semibold capitalize text-stone-900 hover:text-indigo-700 sm:text-base"
            >
              {product.name}
            </Link>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {product.color && (
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-600">
                  {product.color}
                </span>
              )}
              {product.size && (
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  Size {product.size}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="-mr-1 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Remove item"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {isUnavailable ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-red-600">{product.reason}</p>
            <button
              type="button"
              onClick={onRemove}
              className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Remove from cart
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <QtyStepper
              value={product.qty}
              max={product.qtyLeft || product.qty}
              onChange={(qty) => onQtyChange(qty)}
            />
            <div className="text-right">
              <p className="text-sm font-bold text-stone-900">{formatPrice(product.totalPrice)}</p>
              {product.qty > 1 && (
                <p className="text-xs text-stone-500">
                  {formatPrice(product.price)} each
                </p>
              )}
            </div>
          </div>
        )}
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
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-stone-900">Order summary</h2>
      <p className="mt-0.5 text-sm text-stone-500">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between text-stone-600">
          <dt>Subtotal</dt>
          <dd className="font-medium text-stone-900">{formatPrice(subtotal)}</dd>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-700">
            <dt>Coupon discount</dt>
            <dd className="font-medium">−{formatPrice(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-stone-100 pt-3 text-base">
          <dt className="font-semibold text-stone-900">Total</dt>
          <dd className="font-bold text-stone-900">{formatPrice(total)}</dd>
        </div>
      </dl>

      <form onSubmit={onApplyCoupon} className="mt-5 border-t border-stone-100 pt-5">
        <label htmlFor="coupon-code" className="text-sm font-medium text-stone-700">
          Coupon code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="coupon-code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            type="text"
            placeholder="Enter code"
            className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={couponLoading}
            className="shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
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

      {showCheckout && (
        <Link
          to="/order-payment"
          state={{ sumTotalPrice: total }}
          className={`mt-6 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold text-white transition ${
            canCheckout
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'pointer-events-none bg-stone-300'
          }`}
        >
          Proceed to checkout
        </Link>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 text-xs text-stone-500">
        <p className="flex items-center gap-2">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-indigo-600" />
          Secure checkout
        </p>
        <p className="flex items-center gap-2">
          <TruckIcon className="h-4 w-4 shrink-0 text-indigo-600" />
          Fast dispatch on confirmed orders
        </p>
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
    dispatch(fetchCouponAction(couponInput.trim()))
    setCouponInput('')
  }

  const { coupon, loading: couponLoading, error: couponError, isAdded } = useSelector(
    (state) => state?.coupons
  )
  const { cartItems, stockWarnings, validating } = useSelector((state) => state?.carts)

  const availableItems = cartItems?.filter((item) => !item.unavailable) || []
  const hasUnavailable = cartItems?.some((item) => item.unavailable)
  const itemCount = availableItems.reduce((acc, item) => acc + (item.qty || 0), 0)

  const subtotal = useMemo(
    () => availableItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0),
    [availableItems]
  )

  const discountPercent = coupon?.coupon?.discount || 0
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0
  const total = subtotal - discountAmount

  const changeOrderItemQtyHandler = (productId, color, size, qty) => {
    dispatch(changeOrderItemQty({ productId, color, size, qty }))
    dispatch(getCartItemsFromLocalStorageAction())
  }

  const removeOrderItemQtyHandler = (productId, color, size) => {
    dispatch(removeOrderItemQty({ productId, color, size }))
    dispatch(getCartItemsFromLocalStorageAction())
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
      <div className="bg-stone-50">
        <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 sm:py-20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <TruckIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-stone-900 sm:text-3xl">Your cart is empty</h1>
          <p className="mt-2 text-stone-600">
            Add items from the store to see them here.
          </p>
          <Link
            to="/products-filters"
            className="mt-8 inline-flex rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Start shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 pb-28 lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link
          to="/products-filters"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Continue shopping
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Your cart
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout
            </p>
          </div>
        </div>

        {stockWarnings?.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-900">Cart updated for stock</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-800">
                  {stockWarnings.map((w, i) => (
                    <li key={i}>
                      <span className="capitalize font-medium">{w.name}</span> — {w.reason}
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
          <div className="mt-12 py-16">
            <LoadingComponent />
          </div>
        ) : (
          <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
            <section aria-labelledby="cart-items" className="lg:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <ul id="cart-items" className="divide-y divide-stone-100 px-4 sm:px-5">
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
            </section>

            <aside className="mt-8 hidden lg:col-span-5 lg:mt-0 lg:block">
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
                />
              </div>
            </aside>
          </div>
        )}

        {!validating && (
          <div className="mt-6 lg:hidden">
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
              showCheckout={false}
            />
          </div>
        )}

        {availableItems.length === 0 && !validating && (
          <p className="mt-6 text-center text-sm font-medium text-red-600">
            No available items to checkout. Remove or replace unavailable products.
          </p>
        )}
      </div>

      {/* Mobile sticky checkout bar — quick-commerce pattern */}
      {!validating && availableItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-stone-500">Total</p>
              <p className="text-lg font-bold text-stone-900">{formatPrice(total)}</p>
            </div>
            <Link
              to="/order-payment"
              state={{ sumTotalPrice: total }}
              className="flex-1 max-w-[12rem] rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}
