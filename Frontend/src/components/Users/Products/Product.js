import { useEffect, useState, useRef, useCallback } from 'react'
import { RadioGroup } from '@headlessui/react'
import Swal from 'sweetalert2'
import { Carousel } from 'react-responsive-carousel'
import 'react-responsive-carousel/lib/styles/carousel.min.css'
import { CurrencyDollarIcon, GlobeAmericasIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/20/solid'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import { fetchProductAction } from '../../../redux/slices/products/productSlices'
import {
  addOrderToCartaction,
  getCartItemsFromLocalStorageAction,
} from '../../../redux/slices/cart/cartSlices'
import { fetchColorsAction } from '../../../redux/slices/categories/colorsSlice'
import {
  createReviewAction,
  updateReviewAction,
  deleteReviewAction,
} from '../../../redux/slices/reviews/reviewsSlice'

const policies = [
  {
    name: 'Rapid Dispatch',
    icon: GlobeAmericasIcon,
    description:
      'Swiftly receive your order with lightning-fast delivery service.',
  },
  {
    name: 'Cost-effectiveness',
    icon: CurrencyDollarIcon,
    description:
      'Maximize worth: value-packed options for your hard-earned investment.',
  },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Product() {
  //dispatch
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [qty, setQty] = useState(1)
  const [reviewSort, setReviewSort] = useState('') // 'asc' | 'desc' | ''
  const [editingReview, setEditingReview] = useState(null) // review _id being edited
  const [editForm, setEditForm] = useState({ rating: '', message: '' })
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 0, message: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [filterTag, setFilterTag] = useState(null)

  let productDetails = {}

  //get id from params
  const { id } = useParams()
  useEffect(() => {
    if (id) dispatch(fetchProductAction(id))
    dispatch(fetchColorsAction())
  }, [id, dispatch])

  //get all colors from store for hex lookup
  const allColors = useSelector((state) => state?.colors?.colors?.colors) || []
  const colorHexMap = {}
  allColors.forEach((c) => {
    colorHexMap[c.name] = c.hex
  })

  //get data from store
  const { loading, error, product } = useSelector((state) => state?.products)
  const { cartItems = [] } = useSelector((state) => state?.cart || {})
  const { userAuth } = useSelector((state) => state?.users)
  const currentUserId = userAuth?.userInfo?._id

  //Get cart items from localStorage
  useEffect(() => {
    dispatch(getCartItemsFromLocalStorageAction())
  }, [dispatch])

  //Add to cart handler
  const addToCartHandler = () => {
    if (selectedColor === '') {
      Swal.fire({
        icon: 'error',
        title: 'Oops...!',
        text: 'Please select product color',
      })
      return
    }

    if (selectedSize === '') {
      Swal.fire({
        icon: 'error',
        title: 'Oops...!',
        text: 'Please select product size',
      })
      return
    }

    dispatch(
      addOrderToCartaction({
        _id: product?._id,
        name: product?.name,
        qty: qty,
        price: product?.price,
        description: product?.description,
        color: selectedColor,
        size: selectedSize,
        image: product?.images?.[0],
        totalPrice: product?.price * qty,
        qtyLeft: product?.qtyLeft,
      })
    ).then(() => {
      navigate('/shopping-cart')
    })
  }

  //Review handlers
  const handleEditReview = (review) => {
    setEditingReview(review._id)
    setEditForm({ rating: review.rating, message: review.message })
    setShowReviewModal(true)
  }

  const handleUpdateReview = (e) => {
    e.preventDefault()
    dispatch(
      updateReviewAction({
        id: editingReview,
        rating: Number(editForm.rating),
        message: editForm.message,
      })
    ).unwrap().then(() => {
      setEditingReview(null)
      setEditForm({ rating: '', message: '' })
      setShowReviewModal(false)
      dispatch(fetchProductAction(id))
      pollForModeration()
      Swal.fire({ icon: 'success', title: 'Updated!', text: 'Review updated! Re-checking content...' })
    }).catch((err) => {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'Failed to update review' })
    })
  }

  const handleDeleteReview = (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      dispatch(deleteReviewAction({ id: reviewId, productID: id })).then(() => {
        dispatch(fetchProductAction(id))
      })
    }
  }

  const pollRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollForModeration = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    let attempts = 0
    const maxAttempts = 8
    pollRef.current = setInterval(() => {
      attempts++
      dispatch(fetchProductAction(id))
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 3000)
  }, [dispatch, id])

  const handleSubmitReview = (e) => {
    e.preventDefault()
    if (!reviewForm.rating) {
      Swal.fire({ icon: 'error', title: 'Oops...!', text: 'Please select a rating' })
      return
    }
    if (!reviewForm.message.trim()) {
      Swal.fire({ icon: 'error', title: 'Oops...!', text: 'Please enter a message' })
      return
    }
    setReviewSubmitting(true)
    dispatch(
      createReviewAction({
        id,
        rating: Number(reviewForm.rating),
        message: reviewForm.message,
      })
    ).unwrap().then(() => {
      setShowReviewModal(false)
      setReviewForm({ rating: 0, message: '' })
      dispatch(fetchProductAction(id))
      pollForModeration()
      Swal.fire({ icon: 'success', title: 'Thank you!', text: 'Your review is live! Content check in progress...' })
    }).catch((err) => {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'Failed to submit review' })
    }).finally(() => {
      setReviewSubmitting(false)
    })
  }

  const positiveTags = new Set([
    'Good quality', 'Durable', 'Value for money', 'Attractive design',
    'Comfortable fit', 'Works as expected', 'Would recommend', 'Highly satisfied',
  ])
  const negativeTags = new Set([
    'Poor quality', 'Fragile', 'Overpriced', 'Poor design',
    'Wrong size', 'Defective', 'Would not recommend', 'Disappointed',
  ])
  const getTagColor = (tag) => {
    if (positiveTags.has(tag)) return 'bg-green-100 text-green-700'
    if (negativeTags.has(tag)) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
  }

  const visibleReviews = (product?.reviews || []).filter((r) => {
    if (r.moderationStatus === 'approved' || !r.moderationStatus) return true
    return r.user?._id === currentUserId
  })

  const approvedReviewTags = visibleReviews
    .filter((r) => r.moderationStatus === 'approved' || !r.moderationStatus)
    .flatMap((r) => r.tags || [])
  const tagCounts = {}
  approvedReviewTags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])

  let sortedReviews = [...visibleReviews]
  if (filterTag) {
    sortedReviews = sortedReviews.filter((r) => r.tags?.includes(filterTag))
  }
  if (reviewSort === 'asc') {
    sortedReviews.sort((a, b) => a.rating - b.rating)
  } else if (reviewSort === 'desc') {
    sortedReviews.sort((a, b) => b.rating - a.rating)
  }

  return (
    <div className="bg-white">
      <main className="mx-auto mt-8 max-w-2xl px-4 pb-16 sm:px-6 sm:pb-24 lg:max-w-7xl lg:px-8">
        <div className="lg:grid lg:auto-rows-min lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-5 lg:col-start-8">
            <div className="flex justify-between">
              <h1
                className="text-xl font-medium text-gray-900"
                style={{ textTransform: 'capitalize', fontSize: '25px' }}
              >
                {product?.name}
              </h1> 
            </div>
            <div>
            <p className="text-xl font-medium text-gray-900">
                ₹ {product?.price}.00
              </p>
            </div>
            {/* Reviews */}
            <div className="mt-4">
              <h2 className="sr-only">Reviews</h2>
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  {product?.reviews?.length > 0 ? product?.averageRating : 0}
                  {/* <span className="sr-only"> out of 5 stars</span> */}
                </p>
                <div className="ml-1 flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <StarIcon
                      key={rating}
                      className={classNames(
                        +product?.averageRating > rating
                          ? 'text-yellow-400'
                          : 'text-gray-200',
                        'h-5 w-5 flex-shrink-0'
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="ml-4 text-sm text-gray-300"
                ></div>
                <div className="ml-4 flex">
                  <a
                    href="#"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    style={{
                      textTransform: 'capitalize',
                      fontSize: '18px',
                      marginTop: '20px',
                      marginBottom: '20px',
                    }}
                  >
                    {productDetails?.product?.totalReviews} total reviews
                  </a>
                </div>
              </div>
              {/* leave a review */}

              <div className="mt-4">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  style={{ textTransform: 'capitalize', fontSize: '20px' }}
                >
                  Leave a review
                </button>
              </div>
            </div>
          </div>

          {/* Image gallery */}

          <div className="mt-8 lg:col-span-7 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mt-0">
            <h2 className="sr-only">Images</h2>

            <Carousel
              showStatus={false}
              showArrows={false}
              renderIndicator={(onClickHandler, isSelected, index, label) => {
                if (isSelected) {
                  return (
                    <div
                      key={index}
                      className="selected-indicator"
                      onClick={onClickHandler}
                    ></div>
                  )
                }
                return (
                  <div
                    key={index}
                    className="indicator"
                    onClick={onClickHandler}
                  ></div>
                )
              }}
              className="rounded-lg"
            >
              {product?.images?.map((image, index) => (
                <div key={index} style={{ maxHeight: '650px' }}>
                  <img
                    src={image}
                    alt={image.imageAlt}
                    style={{ height: '100%' }}
                  />
                </div>
              ))}
            </Carousel>
          </div>

          <div className="mt-8 lg:col-span-5">
            <>
              {/* Color picker */}
              <div>
                <h2 className="text-sm font-medium text-gray-900">Color</h2>
                <div className="flex items-center space-x-3">
                  <RadioGroup value={selectedColor} onChange={setSelectedColor}>
                    <div className="mt-4 flex items-center space-x-3">
                      {product?.colors?.map((color) => (
                        <RadioGroup.Option
                          key={color}
                          value={color}
                          className={({ active, checked }) =>
                            classNames(
                              active && checked ? 'ring ring-offset-1' : '',
                              !active && checked ? 'ring-2' : '',
                              '-m-0.5 relative p-0.5 rounded-full flex items-center justify-center cursor-pointer focus:outline-none'
                            )
                          }
                        >
                          <RadioGroup.Label as="span" className="sr-only">
                            {color}
                          </RadioGroup.Label>
                          <span
                            style={{ backgroundColor: colorHexMap[color] || color }}
                            title={color}
                            aria-hidden="true"
                            className={classNames(
                              'h-8 w-8 border border-black border-opacity-10 rounded-full'
                            )}
                          />
                        </RadioGroup.Option>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Size picker */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-900">Size</h2>
                </div>
                <RadioGroup
                  value={selectedSize}
                  onChange={setSelectedSize}
                  className="mt-2"
                >
                  {/* Choose size */}
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {product?.sizes?.map((size) => (
                      <RadioGroup.Option
                        key={size}
                        value={size}
                        className={({ active, checked }) => {
                          return classNames(
                            checked
                              ? 'bg-indigo-600 border-transparent  text-white hover:bg-indigo-700'
                              : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50',
                            'border rounded-md py-3 px-3 flex items-center justify-center text-sm font-medium uppercase sm:flex-1 cursor-pointer'
                          )
                        }}
                      >
                        <RadioGroup.Label as="span">{size}</RadioGroup.Label>
                      </RadioGroup.Option>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              {/* Quantity picker */}
              <div className="mt-8">
                <h2 className="text-sm font-medium text-gray-900">Quantity</h2>
                <div className="mt-2 flex items-center space-x-3">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="rounded-md border border-gray-300 px-3 py-1 text-lg font-medium text-gray-700 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium text-gray-900 w-8 text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(Math.min(product?.qtyLeft || 1, qty + 1))}
                    className="rounded-md border border-gray-300 px-3 py-1 text-lg font-medium text-gray-700 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              {/* add to cart */}
              {product?.qtyLeft <= 0 ? (
                <button
                  style={{ cursor: 'not-allowed' }}
                  disabled
                  className="mt-8 flex w-full items-center justify-center rounded-md border border-transparent bg-gray-600 py-3 px-8 text-base font-medium text-whitefocus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Add to cart
                </button>
              ) : (
                <button
                  onClick={() => addToCartHandler()}
                  className="mt-8 flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-8 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Add to cart
                </button>
              )}
              {/* proceed to check */}

              {cartItems.length > 0 && (
                <Link
                  to="/shopping-cart"
                  className="mt-8 flex w-full items-center justify-center rounded-md border border-transparent bg-green-800 py-3 px-8 text-base font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Proceed to checkout
                </Link>
              )}
            </>

            {/* Product details */}
            <div className="mt-10">
              <h2
                className="text-sm font-medium text-gray-900"
                style={{ textTransform: 'capitalize', fontSize: '25px' }}
              >
                Description
              </h2>
              <div
                className="prose prose-sm mt-4 text-gray-500"
                style={{ textTransform: 'capitalize', fontSize: '17px' }}
              >
                {product?.description}
              </div>
            </div>

            {/* Policies */}
            <section aria-labelledby="policies-heading" className="mt-10">
              <h2 id="policies-heading" className="sr-only">
                Our Policies
              </h2>

              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {policies.map((policy) => (
                  <div
                    key={policy.name}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center"
                  >
                    <dt>
                      <policy.icon
                        className="mx-auto h-6 w-6 flex-shrink-0 text-gray-400"
                        aria-hidden="true"
                      />
                      <span
                        className="mt-4 text-sm font-medium text-gray-900"
                        style={{ fontSize: '18px' }}
                      >
                        {policy.name}
                      </span>
                    </dt>
                    <dd
                      className="mt-1 text-sm text-gray-500"
                      style={{ fontSize: '15px' }}
                    >
                      {policy.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>

        {/* Reviews */}
        <section aria-labelledby="reviews-heading" className="mt-16 sm:mt-24">
          <div className="flex items-center justify-between mb-6">
            <h2
              id="reviews-heading"
              className="text-2xl font-bold text-gray-900"
            >
              Customer Reviews
            </h2>
            <div className="flex items-center gap-3">
              {/* Sort controls */}
              {product?.reviews?.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort:</span>
                  <button
                    onClick={() => setReviewSort(reviewSort === 'desc' ? '' : 'desc')}
                    className={classNames(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      reviewSort === 'desc'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    High → Low
                  </button>
                  <button
                    onClick={() => setReviewSort(reviewSort === 'asc' ? '' : 'asc')}
                    className={classNames(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      reviewSort === 'asc'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    Low → High
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tag summary bar */}
          {sortedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {filterTag && (
                <button
                  onClick={() => setFilterTag(null)}
                  className="rounded-full px-3 py-1 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Clear filter &times;
                </button>
              )}
              {sortedTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={classNames(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                    filterTag === tag
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : `${getTagColor(tag)} border-transparent hover:opacity-80`
                  )}
                >
                  {tag} ({count})
                </button>
              ))}
            </div>
          )}

          {sortedReviews.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
              <p className="text-gray-500">
                {filterTag
                  ? `No reviews match the "${filterTag}" tag.`
                  : 'No reviews yet. Be the first to review this product!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedReviews.map((review) => (
                <div
                  key={review._id}
                  className={classNames(
                    'rounded-xl border p-5 shadow-sm transition-shadow',
                    review.moderationStatus === 'rejected'
                      ? 'border-red-200 bg-red-50/30'
                      : review.moderationStatus === 'pending'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-gray-200 bg-white hover:shadow-md'
                  )}
                >
                  {/* Top row: user info + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {review.user?.fullname?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {review.user?.fullname}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {/* Owner actions */}
                    {currentUserId && review.user?._id === currentUserId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit review"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete review"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Moderation status badges (visible only to the review author) */}
                  {review.moderationStatus === 'pending' && review.user?._id === currentUserId && (
                    <div className="flex items-center gap-2 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <svg className="h-4 w-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-xs font-medium text-amber-700">
                        Checking content...
                      </span>
                    </div>
                  )}
                  {review.moderationStatus === 'rejected' && review.user?._id === currentUserId && (
                    <div className="mb-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 mb-0.5">Review flagged</p>
                      <p className="text-xs text-red-600">
                        {review.moderationReason || 'Your review did not pass our content guidelines. Please edit or delete it.'}
                      </p>
                    </div>
                  )}

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <StarIcon
                        key={i}
                        className={classNames(
                          review.rating > i
                            ? 'text-yellow-400'
                            : 'text-gray-200',
                          'h-4 w-4'
                        )}
                      />
                    ))}
                    <span className="ml-1 text-xs font-medium text-gray-500">
                      {review.rating}/5
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {review?.message}
                  </p>

                  {/* Tags */}
                  {review?.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {review.tags.map((tag) => (
                        <span
                          key={tag}
                          className={classNames(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            getTagColor(tag)
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Review Modal — used for both Create and Edit */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-40 transition-opacity"
            onClick={() => {
              setShowReviewModal(false)
              setEditingReview(null)
              setEditForm({ rating: '', message: '' })
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingReview ? 'Edit Your Review' : 'Write a Review'}
                </h3>
                <button
                  onClick={() => {
                    setShowReviewModal(false)
                    setEditingReview(null)
                    setEditForm({ rating: '', message: '' })
                  }}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={editingReview ? handleUpdateReview : handleSubmitReview}
                className="px-6 py-5 space-y-5"
              >
                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          editingReview
                            ? setEditForm({ ...editForm, rating: star })
                            : setReviewForm({ ...reviewForm, rating: star })
                        }
                      >
                        <StarIcon
                          className={classNames(
                            star <= (editingReview ? editForm.rating : reviewForm.rating)
                              ? 'text-yellow-400'
                              : 'text-gray-200',
                            'h-8 w-8 cursor-pointer hover:text-yellow-300 transition-colors'
                          )}
                        />
                      </button>
                    ))}
                    {(editingReview ? editForm.rating : reviewForm.rating) > 0 && (
                      <span className="ml-2 text-sm text-gray-500">
                        {editingReview ? editForm.rating : reviewForm.rating} / 5
                      </span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review
                  </label>
                  <textarea
                    rows={4}
                    value={editingReview ? editForm.message : reviewForm.message}
                    onChange={(e) =>
                      editingReview
                        ? setEditForm({ ...editForm, message: e.target.value })
                        : setReviewForm({ ...reviewForm, message: e.target.value })
                    }
                    placeholder="Share your experience with this product..."
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {reviewSubmitting
                      ? 'Submitting...'
                      : editingReview
                      ? 'Update Review'
                      : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false)
                      setEditingReview(null)
                      setEditForm({ rating: '', message: '' })
                    }}
                    className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
