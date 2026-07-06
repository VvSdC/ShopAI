import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ClipboardDocumentListIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { getUserProfileAction, deleteAccountAction } from '../../../redux/slices/users/usersSlice'
import {
  fetchUserOrdersAction,
  cancelOrderAction,
  applyVerifiedOrderPayment,
} from '../../../redux/slices/orders/ordersSlices'
import { fetchMyReturnsAction } from '../../../redux/slices/returns/returnsSlice'
import CustomerDetails from './CustomerDetails'
import AddressManagement from './AddressManagement'
import ReturnRequestModal from './ReturnRequestModal'
import {
  getPaymentStatusLabel,
  getPaymentStatusColor,
  getRefundSummary,
  getOrderDisplayStatus,
  getOrderDisplayStatusColor,
  orderFulfillmentStatus,
  isReturnInProgress,
  REFUND_TIMELINE,
} from '../../../utils/orderDisplay'
import { useStripeReturnHandler, isStripePaymentReturnSearch } from '../../ChatBot/useStripeReturnHandler'
import ConfirmDialog from '../../common/ConfirmDialog'
import ShopPagination from '../Products/ShopPagination'

const paymentStatusColor = {
  paid: 'bg-green-100 text-green-800',
  'Not paid': 'bg-red-100 text-red-800',
}

function CancelledOrderNotice({ order }) {
  const refund = getRefundSummary(order)

  return (
    <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-center">
      <p className="text-sm font-medium text-red-800">This order has been cancelled</p>
      {refund ? (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-amber-900">
            {refund.amountLabel ? (
              <>
                A refund of <span className="font-semibold">{refund.amountLabel}</span> is in
                progress to your original payment method.
              </>
            ) : (
              <>Your refund is in progress to your original payment method.</>
            )}
          </p>
          <p className="text-xs text-stone-600">
            It typically appears within {refund.timeline || REFUND_TIMELINE}.
          </p>
        </div>
      ) : order.paymentStatus === 'paid' ? (
        <p className="mt-2 text-xs text-stone-600">
          Refund details will appear here once processed. Contact support if you have questions.
        </p>
      ) : (
        <p className="mt-2 text-xs text-stone-600">No payment was taken for this order.</p>
      )}
    </div>
  )
}

function OrderDetailsModal({ order, onClose, onCancel, onReturn }) {
  if (!order) return null
  const addr = order.shippingAddress

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-40 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Order #{order.orderNumber}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {/* Delivery Address */}
            {addr && (
              <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Address</h4>
                <p className="text-sm text-gray-900 font-medium">
                  {addr.firstName} {addr.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.address}, {addr.city}, {addr.province} {addr.postalCode}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.country} &middot; {addr.phone}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-4">
              {order.orderItems?.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 capitalize truncate">
                      {product.name}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">₹{product.price}</p>
                    <p className="text-xs text-gray-500">Qty: {product.qty || 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">₹{order.totalPrice}</span>
            </div>
            {/* Cancel button — only for pending/processing orders */}
            {['pending', 'processing'].includes(orderFulfillmentStatus(order)) && (
              <button
                onClick={() => onCancel(order._id)}
                className="mt-4 w-full rounded-md bg-red-600 py-2 px-4 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Cancel Order
              </button>
            )}
            {orderFulfillmentStatus(order) === 'delivered' &&
              !isReturnInProgress(order) &&
              order.refundStatus === 'none' && (
              <button
                onClick={() => onReturn(order)}
                className="mt-4 w-full rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Request Return
              </button>
            )}
            {orderFulfillmentStatus(order) === 'cancelled' && <CancelledOrderNotice order={order} />}
          </div>
        </div>
      </div>
    </div>
  )
}

const PROFILE_TABS = [
  { id: 'orders', label: 'My orders', icon: ShoppingBagIcon },
  { id: 'addresses', label: 'Addresses', icon: MapPinIcon },
]

function ProfileSection({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

export default function CustomerProfile() {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [returnOrder, setReturnOrder] = useState(null)
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('orders')
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const ORDERS_PER_PAGE = 5
  const [awaitingPaymentVerify, setAwaitingPaymentVerify] = useState(() =>
    isStripePaymentReturnSearch(searchParams.toString())
  )
  const skipOrdersFetchAfterPaymentRef = useRef(false)
  const currentPageRef = useRef(currentPage)

  currentPageRef.current = currentPage

  useStripeReturnHandler({
    defaultRedirect: '/customer-profile',
    onVerified: async (data) => {
      if (data?.order) {
        dispatch(applyVerifiedOrderPayment(data.order))
      }
      await dispatch(
        fetchUserOrdersAction({
          page: currentPageRef.current,
          limit: ORDERS_PER_PAGE,
          force: true,
        })
      ).unwrap()
      dispatch(fetchMyReturnsAction())
      skipOrdersFetchAfterPaymentRef.current = true
      setAwaitingPaymentVerify(false)
      const orderNo = data?.order?.orderNumber
      setToast(
        orderNo
          ? `Payment confirmed for order #${orderNo}.`
          : 'Payment confirmed successfully.'
      )
      setTimeout(() => setToast(''), 8000)
    },
    onVerifyFailed: () => {
      setAwaitingPaymentVerify(false)
    },
  })

  useEffect(() => {
    dispatch(getUserProfileAction())
  }, [dispatch])

  useEffect(() => {
    if (awaitingPaymentVerify) return
    if (skipOrdersFetchAfterPaymentRef.current) {
      skipOrdersFetchAfterPaymentRef.current = false
      return
    }
    dispatch(fetchUserOrdersAction({ page: currentPage, limit: ORDERS_PER_PAGE }))
    dispatch(fetchMyReturnsAction())
  }, [dispatch, currentPage, awaitingPaymentVerify])

  const { error: profileError, loading: profileLoading, profile } = useSelector(
    (state) => state?.users
  )
  const { userOrders, pagination, loading: ordersLoading, error: ordersError } = useSelector(
    (state) => state?.orders
  )
  const { myReturns } = useSelector((state) => state?.returns)

  const loading = profileLoading || ordersLoading || awaitingPaymentVerify
  const error = profileError || ordersError

  const handleCancelOrder = (orderId) => {
    setConfirmCancel(orderId)
  }

  const confirmCancelOrder = () => {
    dispatch(cancelOrderAction(confirmCancel)).then((result) => {
      setConfirmCancel(null)
      setSelectedOrder(null)
      if (cancelOrderAction.fulfilled.match(result)) {
        setToast(result.payload?.message || 'Order cancelled.')
        setTimeout(() => setToast(''), 6000)
      }
      dispatch(fetchUserOrdersAction({ page: currentPage, limit: ORDERS_PER_PAGE }))
    })
  }

  const handleDeleteAccount = () => {
    setConfirmDeleteAccount(true)
  }

  const confirmDeleteAccountAction = () => {
    setConfirmDeleteAccount(false)
    dispatch(deleteAccountAction()).then(() => {
      window.location.href = '/'
    })
  }

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 6000)
  }

  const totalPages = pagination?.totalPages || 1

  const profileUser = profile?.user
  const memberSince = profileUser?.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="bg-white pb-28 lg:pb-10">
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-stone-500">
            <Link to="/" className="hover:text-indigo-600">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-stone-800">My account</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">My account</h1>
              <p className="mt-1 text-sm text-stone-600">
                Manage your profile, saved addresses, and order history
              </p>
            </div>
            {!loading && pagination?.total != null && activeTab === 'orders' && (
              <div className="hidden text-right lg:block">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Total orders
                </p>
                <p className="text-2xl font-bold text-indigo-700">{pagination.total}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {toast && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toast}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <aside className="lg:col-span-4 xl:col-span-3">
            <CustomerDetails
              email={profileUser?.email}
              dateJoined={memberSince}
              fullName={profileUser?.fullname}
            />

            <nav className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              {PROFILE_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3.5 text-left text-sm font-medium transition-colors last:border-b-0 ${
                    activeTab === id
                      ? 'bg-indigo-50 text-indigo-800'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      activeTab === id ? 'text-indigo-600' : 'text-stone-400'
                    }`}
                  />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-4">
              <p className="text-xs font-medium text-red-900">Danger zone</p>
              <p className="mt-1 text-xs text-red-800/80">
                Permanently delete your account and personal data. Order records are kept for
                compliance.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Delete my account
              </button>
            </div>
          </aside>

          <main className="mt-8 lg:col-span-8 lg:mt-0 xl:col-span-9">
            {activeTab === 'addresses' && (
              <ProfileSection
                title="Saved addresses"
                description="Manage delivery addresses used at checkout"
              >
                <AddressManagement onToast={showToast} />
              </ProfileSection>
            )}

            {activeTab === 'orders' && (
              <>
                {myReturns?.length > 0 && (
                  <div className="mb-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                    <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
                      <h2 className="text-sm font-bold text-stone-900">Recent return requests</h2>
                    </div>
                    <ul className="divide-y divide-stone-100 px-5 py-2">
                      {myReturns.slice(0, 5).map((r) => (
                        <li
                          key={r._id}
                          className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                        >
                          <span className="text-stone-600">
                            Order #{r.orderNumber} · {r.items?.length} item(s)
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-stone-800">
                            {r.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-stone-100 px-5 py-3">
                      <Link
                        to="/return-refund-policy"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View return policy
                      </Link>
                    </div>
                  </div>
                )}

                <ProfileSection
                  title="Order history"
                  description="Track payments, delivery status, and returns"
                >
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <svg
                        className="h-8 w-8 animate-spin text-indigo-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </div>
                  ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
                      {error?.message || 'Something went wrong'}
                    </div>
                  ) : !userOrders || userOrders.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-stone-200 py-12 text-center">
                      <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-stone-300" />
                      <h3 className="mt-2 text-sm font-semibold text-stone-900">No orders yet</h3>
                      <p className="mt-1 text-sm text-stone-500">
                        Start shopping to see your orders here.
                      </p>
                      <Link
                        to="/products-filters"
                        className="mt-4 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Browse products
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-stone-200">
                        <table className="min-w-full divide-y divide-stone-200">
                          <thead className="bg-stone-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                                Order #
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                                Payment
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                                Status
                              </th>
                              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 sm:table-cell">
                                Items
                              </th>
                              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 md:table-cell">
                                Method
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                                Total
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 bg-white">
                            {userOrders.map((order) => (
                              <tr key={order._id} className="hover:bg-stone-50/80">
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-stone-900">
                                  {order.orderNumber}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getPaymentStatusColor(
                                      order,
                                      paymentStatusColor
                                    )}`}
                                  >
                                    {getPaymentStatusLabel(order)}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getOrderDisplayStatusColor(
                                      order
                                    )}`}
                                  >
                                    {getOrderDisplayStatus(order).displayStatusLabel}
                                  </span>
                                </td>
                                <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-stone-600 sm:table-cell">
                                  {order.orderItems?.length || 0}
                                </td>
                                <td className="hidden whitespace-nowrap px-4 py-4 text-sm capitalize text-stone-600 md:table-cell">
                                  {order.paymentMethod}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-stone-900">
                                  ₹{order.totalPrice}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-right">
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedOrder(order)}
                                      className="rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    >
                                      View
                                    </button>
                                    {['pending', 'processing'].includes(orderFulfillmentStatus(order)) && (
                                      <button
                                        type="button"
                                        onClick={() => handleCancelOrder(order._id)}
                                        className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                    {orderFulfillmentStatus(order) === 'delivered' &&
                                      !isReturnInProgress(order) &&
                                      order.refundStatus === 'none' && (
                                      <button
                                        type="button"
                                        onClick={() => setReturnOrder(order)}
                                        className="rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                      >
                                        Return
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6">
                        <ShopPagination
                          page={currentPage}
                          totalPages={totalPages}
                          total={pagination?.total ?? 0}
                          limit={ORDERS_PER_PAGE}
                          loading={ordersLoading}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    </>
                  )}
                </ProfileSection>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Order details modal */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onCancel={handleCancelOrder}
        onReturn={(order) => {
          setSelectedOrder(null)
          setReturnOrder(order)
        }}
      />

      {returnOrder && (
        <ReturnRequestModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onSuccess={(msg) => {
            setToast(msg || 'Return request submitted.')
            dispatch(fetchMyReturnsAction())
            dispatch(fetchUserOrdersAction({ page: currentPage, limit: ORDERS_PER_PAGE }))
            setTimeout(() => setToast(''), 5000)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? If you already paid, a refund will be issued to your original payment method within 5–7 business days."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep order"
        onConfirm={confirmCancelOrder}
        onCancel={() => setConfirmCancel(null)}
      />

      <ConfirmDialog
        open={confirmDeleteAccount}
        title="Delete account"
        message="Are you sure you want to delete your account? This action cannot be undone. Your orders will be preserved but all other personal data will be permanently deleted."
        confirmLabel="Delete account"
        cancelLabel="Keep account"
        onConfirm={confirmDeleteAccountAction}
        onCancel={() => setConfirmDeleteAccount(false)}
      />
    </div>
  )
}
