import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getUserProfileAction, deleteAccountAction } from '../../../redux/slices/users/usersSlice'
import {
  fetchUserOrdersAction,
  cancelOrderAction,
  applyVerifiedOrderPayment,
} from '../../../redux/slices/orders/ordersSlices'
import { fetchMyReturnsAction } from '../../../redux/slices/returns/returnsSlice'
import CustomerDetails from './CustomerDetails'
import ReturnRequestModal from './ReturnRequestModal'
import {
  getPaymentStatusLabel,
  getPaymentStatusColor,
  getRefundSummary,
  REFUND_TIMELINE,
} from '../../../utils/orderDisplay'
import { useStripeReturnHandler, isStripePaymentReturnSearch } from '../../ChatBot/useStripeReturnHandler'
import ConfirmDialog from '../../common/ConfirmDialog'
import ShopPagination from '../Products/ShopPagination'

const statusColor = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

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
            {['pending', 'processing'].includes(order.status) && (
              <button
                onClick={() => onCancel(order._id)}
                className="mt-4 w-full rounded-md bg-red-600 py-2 px-4 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Cancel Order
              </button>
            )}
            {order.status === 'delivered' && (
              <button
                onClick={() => onReturn(order)}
                className="mt-4 w-full rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Request Return
              </button>
            )}
            {order.status === 'cancelled' && <CancelledOrderNotice order={order} />}
          </div>
        </div>
      </div>
    </div>
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
    if (
      window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone. Your orders will be preserved but all other data will be permanently deleted.'
      )
    ) {
      dispatch(deleteAccountAction()).then(() => {
        window.location.href = '/'
      })
    }
  }

  const totalPages = pagination?.totalPages || 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile header */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap -mx-3 -mb-3 md:mb-0">
          <div className="w-full md:w-1/3 px-3 mb-3 md:mb-0" />
          <div className="w-full md:w-1/2 px-3 mb-3 md:mb-0">
            <CustomerDetails
              email={profile?.user?.email}
              dateJoined={new Date(profile?.user?.createdAt).toDateString()}
              fullName={profile?.user?.fullname}
            />
          </div>
          <div className="w-full md:w-1/3 px-3 mb-3 md:mb-0" />
        </div>
        {/* Delete Account */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleDeleteAccount}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete My Account
          </button>
        </div>
      </div>

      {/* Orders table */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {toast && (
          <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
            {toast}
          </div>
        )}

        {myReturns?.length > 0 && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent return requests</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {myReturns.slice(0, 5).map((r) => (
                <li key={r._id} className="flex justify-between gap-2">
                  <span>
                    Order #{r.orderNumber} · {r.items?.length} item(s)
                  </span>
                  <span className="capitalize font-medium text-gray-800">{r.status}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/return-refund-policy"
              className="mt-2 inline-block text-xs text-indigo-600 hover:text-indigo-500"
            >
              Return policy
            </Link>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-6">My Orders</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <svg
              className="h-8 w-8 animate-spin text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-center text-red-700">
            {error?.message || 'Something went wrong'}
          </div>
        ) : !userOrders || userOrders.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
            <p className="mt-1 text-sm text-gray-500">Start shopping to see your orders here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Order Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {userOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getPaymentStatusColor(
                            order,
                            paymentStatusColor
                          )}`}
                        >
                          {getPaymentStatusLabel(order)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            statusColor[order.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {order.orderItems?.length || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 capitalize">
                        {order.paymentMethod}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        ₹{order.totalPrice}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                          {['pending', 'processing'].includes(order.status) && (
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          {order.status === 'delivered' && (
                            <button
                              onClick={() => setReturnOrder(order)}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
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

            <ShopPagination
              page={currentPage}
              totalPages={totalPages}
              total={pagination?.total ?? 0}
              limit={ORDERS_PER_PAGE}
              loading={ordersLoading}
              onPageChange={setCurrentPage}
            />
          </>
        )}
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
    </div>
  )
}
