import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  getCartItemsFromLocalStorageAction,
  validateCartAction,
} from '../../../redux/slices/cart/cartSlices'
import { placeOrderAction } from '../../../redux/slices/orders/ordersSlices'
import { getUserProfileAction } from '../../../redux/slices/users/usersSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import formatApiError from '../../../utils/formatApiError'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import AddShippingAddress from '../Forms/AddShippingAddress'
export default function OrderPayment() {
  //get data from location
  const location = useLocation()
  const { sumTotalPrice: originalTotal } = location.state
  //dispatch
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(validateCartAction())
  }, [dispatch])
  //get cart items from store
  const { cartItems, stockWarnings, validating } = useSelector((state) => state?.carts)

  // Filter only available items for the order
  const availableItems = cartItems?.filter((item) => !item.unavailable) || []

  // Recalculate total based on available items
  const sumTotalPrice = availableItems.reduce(
    (acc, item) => acc + (item?.totalPrice || 0),
    0
  )

  //user profile
  useEffect(() => {
    dispatch(getUserProfileAction())
  }, [dispatch])
  const { error } = useSelector((state) => state?.users)

  //selected shipping address from child
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [addressError, setAddressError] = useState('')
  const handleAddressSelect = useCallback((addr) => {
    setSelectedAddress(addr)
    setAddressError('')
  }, [])

  //place order action
  const placeOrderHandler = () => {
    if (!selectedAddress) {
      setAddressError('Please select a shipping address to proceed')
      return
    }

    if (availableItems.length === 0) {
      setAddressError('No available items to order')
      return
    }

    setAddressError('')
    dispatch(
      placeOrderAction({
        shippingAddress: selectedAddress,
        orderItems: availableItems,
        totalPrice: sumTotalPrice,
      })
    )
  }

  const { loading: orderLoading, error: orderErr } = useSelector(
    (state) => state?.orders
  )

  return (
    <>
      {orderErr && <ErrorMsg message={orderErr} />}      {/* Address error modal */}
      {addressError && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setAddressError('')} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Required</h3>
              <p className="mt-2 text-sm text-gray-600">{addressError}</p>
              <button
                onClick={() => setAddressError('')}
                className="mt-5 w-full rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}      <div className="bg-gray-50">
        <main className="mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <h1 className="sr-only">Checkout</h1>

            <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
              <div>
                <div className="mt-10 border-t border-gray-200 pt-10">
                  {/* shipping Address */}
                  <AddShippingAddress onAddressSelect={handleAddressSelect} />
                </div>
              </div>

              {/* Order summary */}
              <div className="mt-10 lg:mt-0">
                <h2
                  className="text-lg font-medium text-gray-900"
                  style={{ fontSize: '30px', marginBottom: '20px' }}
                >
                  Order summary
                </h2>

                <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                  <h3 className="sr-only">Items in your cart</h3>
                  {stockWarnings?.length > 0 && (
                    <div className="mx-4 mt-4 rounded-md bg-yellow-50 border border-yellow-200 p-3">
                      <p className="text-sm font-medium text-yellow-800">
                        Some items were adjusted or removed due to stock changes.
                      </p>
                    </div>
                  )}
                  {validating ? (
                    <div className="py-6"><LoadingComponent /></div>
                  ) : (
                  <ul role="list" className="divide-y divide-gray-200">
                    {availableItems?.map((product) => (
                      <li key={product._id} className="flex py-6 px-4 sm:px-6">
                        <div className="flex-shrink-0">
                          <img
                            src={product.image}
                            alt={product._id}
                            className="w-20 rounded-md"
                          />
                        </div>

                        <div className="ml-6 flex flex-1 flex-col">
                          <div className="flex">
                            <div className="min-w-0 flex-1">
                              <p
                                className="mt-1 text-sm text-gray-500"
                                style={{
                                  fontSize: '20px',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {product.name}
                              </p>
                              <p
                                className="mt-1 text-sm text-gray-500"
                                style={{ fontSize: '20px' }}
                              >
                                {product.size}
                              </p>
                              <p
                                className="mt-1 text-sm text-gray-500"
                                style={{ fontSize: '20px' }}
                              >
                                {product.color}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-1 items-end justify-between pt-2">
                            <p
                              className="mt-1 text-sm font-medium text-gray-900"
                              style={{ fontSize: '20px' }}
                            >
                              ₹ {product?.price} X {product?.qty} = ₹
                              {product?.totalPrice}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  )}
                  <dl className="space-y-6 border-t border-gray-200 py-6 px-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm" style={{ fontSize: '25px' }}>
                        Taxes
                      </dt>
                      <dd
                        className="text-sm font-medium text-gray-900"
                        style={{ fontSize: '20px' }}
                      >
                        ₹0.00
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                      <dt
                        className="text-base font-medium"
                        style={{ fontSize: '25px' }}
                      >
                        Sub Total
                      </dt>
                      <dd
                        className="text-base font-medium text-gray-900"
                        style={{ fontSize: '25px' }}
                      >
                        ₹ {sumTotalPrice}.00
                      </dd>
                    </div>
                  </dl>

                  <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                    {orderLoading ? (
                      <LoadingComponent />
                    ) : (
                      <button
                        onClick={placeOrderHandler}
                        className="w-full rounded-md border border-transparent bg-indigo-600 py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                      >
                        Confirm Payment - ₹{sumTotalPrice}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
