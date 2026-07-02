import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { RadioGroup } from '@headlessui/react'
import Swal from 'sweetalert2'
import {
  CurrencyDollarIcon,
  GlobeAmericasIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/20/solid'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProductAction } from '../../../redux/slices/products/productSlices'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
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
import WishlistButton from './WishlistButton'
import SimilarProductsSection from './SimilarProductsSection'
import { getCartUnitCount } from '../../../utils/cartCount'
import {
  displaySizeLabel,
  productRequiresSizeSelection,
  resolveCartSize,
} from '../../../utils/sizeMeasurement'

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

const formatPrice = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`

/** Request a display-sized Cloudinary URL so the browser does not upscale a small asset */
function productImageUrl(url, variant = 'main') {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url

  const transforms =
    variant === 'thumb'
      ? 'w_112,h_112,c_fill,q_auto:good,f_auto'
      : 'w_900,h_900,c_limit,q_auto:good,f_auto,dpr_auto'

  if (url.includes('/upload/')) {
    const parts = url.split('/upload/')
    if (parts[1].startsWith('w_')) return url
    return `${parts[0]}/upload/${transforms}/${parts[1]}`
  }
  return url
}

function ProductDetailSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="mb-5 h-4 w-1/3 rounded bg-stone-200" />
      <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm">
        <div className="lg:grid lg:grid-cols-2">
          <div className="border-b border-stone-100 p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="skeleton-shimmer mx-auto h-72 w-full max-w-lg rounded-2xl bg-stone-100 sm:h-80 md:h-96 lg:h-[28rem] lg:max-w-none" />
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-[4.5rem] w-[4.5rem] rounded-xl bg-stone-100" />
              ))}
            </div>
          </div>
          <div className="space-y-4 p-6 sm:p-8 lg:p-10">
            <div className="flex gap-2">
              <div className="skeleton-shimmer h-6 w-20 rounded-md bg-stone-100" />
              <div className="skeleton-shimmer h-6 w-24 rounded-md bg-stone-100" />
            </div>
            <div className="skeleton-shimmer h-9 w-4/5 rounded bg-stone-100" />
            <div className="skeleton-shimmer h-10 w-1/3 rounded bg-stone-100" />
            <div className="skeleton-shimmer h-12 w-full rounded-xl bg-stone-100" />
            <div className="skeleton-shimmer h-12 w-full rounded-xl bg-stone-100" />
            <div className="skeleton-shimmer h-14 w-full rounded-xl bg-stone-100" />
          </div>
        </div>
      </div>
    </div>
  )
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
  const [activeImage, setActiveImage] = useState(0)

  //get id from params
  const { id } = useParams()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (id) dispatch(fetchProductAction(id))
    dispatch(fetchColorsAction())
    setActiveImage(0)
    setSelectedSize('')
    setSelectedColor('')
    setQty(1)
  }, [id, dispatch])

  const { product, loading, error } = useSelector((state) => state?.products)
  const showSizeSelector = productRequiresSizeSelection(product)
  const sizeLabel = displaySizeLabel(product)
  const { cartItems = [] } = useSelector((state) => state?.cart || {})
  const cartUnitCount = getCartUnitCount(cartItems)
  const { userAuth } = useSelector((state) => state?.users)
  const isLoggedIn = userAuth?.isLoggedIn
  const currentUserId = userAuth?.userInfo?._id

  useEffect(() => {
    if (!product?._id || String(product._id) !== String(id)) return
    const colors = product.colors || []
    if (colors.length > 0) {
      setSelectedColor(colors[0])
    }
    const sizes = product.sizes || []
    if (product.sizeMeasurementType === 'none') {
      setSelectedSize('One Size')
    } else if (sizes.length > 0) {
      setSelectedSize(sizes[0])
    }
  }, [id, product?._id, product?.sizeMeasurementType, product?.sizes, product?.colors])

  //get all colors from store for hex lookup
  const allColors = useSelector((state) => state?.colors?.colors?.colors) || []
  const colorHexMap = {}
  allColors.forEach((c) => {
    colorHexMap[c.name] = c.hex
  })

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

    if (showSizeSelector && !resolveCartSize(product, selectedSize)) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...!',
        text: `Please select ${sizeLabel.toLowerCase()}`,
      })
      return
    }

    const cartSize = resolveCartSize(product, selectedSize)

    dispatch(
      addOrderToCartaction({
        _id: product?._id,
        name: product?.name,
        qty: qty,
        price: product?.price,
        description: product?.description,
        color: selectedColor,
        size: cartSize,
        image: product?.images?.[0],
        totalPrice: product?.price * qty,
        qtyLeft: product?.qtyLeft,
      })
    )
      .unwrap()
      .then(() => navigate('/shopping-cart'))
      .catch((err) => {
        const message =
          typeof err === 'string'
            ? err
            : err?.message || 'Something went wrong. Please try again.'
        Swal.fire({
          icon: 'error',
          title: 'Could not add to cart',
          text: message,
        })
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
    return 'bg-stone-100 text-stone-600'
  }

  const isPublicReview = (r) =>
    !r.moderationStatus || r.moderationStatus === 'approved'

  const visibleReviews = (product?.reviews || []).filter(isPublicReview)

  const approvedReviewTags = visibleReviews.flatMap((r) => r.tags || [])
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

  const images = product?.images?.length ? product.images : []
  const reviewCount = visibleReviews.length
  const displayRating =
    visibleReviews.length > 0
      ? (
          visibleReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          visibleReviews.length
        ).toFixed(1)
      : product?.averageRating || 0
  const rating = Number(displayRating || 0)
  const inStock = (product?.qtyLeft ?? 0) > 0
  const lowStock = inStock && product.qtyLeft <= 5

  const stickyTop = 'calc(var(--shopai-navbar-height, 5rem) + 1.25rem)'

  return (
    <div className="min-h-screen bg-stone-100">
      <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8">
        {loading && !product?._id ? (
          <ProductDetailSkeleton />
        ) : error ? (
          <ErrorMsg message={error?.message || 'Failed to load product'} />
        ) : (
          <>
            <nav
              aria-label="Breadcrumb"
              className="mb-5 flex flex-wrap items-center gap-1 text-sm text-stone-500"
            >
              <Link to="/" className="hover:text-indigo-600">
                Home
              </Link>
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
              {product?.category && (
                <>
                  <Link
                    to={`/products-filters?category=${product.category}`}
                    className="capitalize hover:text-indigo-600"
                  >
                    {product.category}
                  </Link>
                  <ChevronRightIcon className="h-4 w-4 shrink-0" />
                </>
              )}
              <span className="font-medium text-stone-800">{product?.name}</span>
            </nav>

            {/* Product hero — gallery + purchase */}
            <div className="animate-fade-up overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm">
              <div className="lg:grid lg:grid-cols-2 lg:items-stretch">
                {/* Gallery */}
                <div className="flex min-h-0 flex-col border-b border-stone-100 p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
                  <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start">
                    {images.length > 1 && (
                      <div className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:w-[4.5rem] lg:flex-col lg:justify-center lg:overflow-visible lg:pb-0">
                        {images.map((image, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setActiveImage(index)}
                            className={classNames(
                              'h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border-2 bg-stone-50 transition lg:h-[4.5rem] lg:w-full',
                              activeImage === index
                                ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                                : 'border-stone-200 hover:border-stone-300'
                            )}
                          >
                            <img
                              src={productImageUrl(image, 'thumb')}
                              alt=""
                              width={112}
                              height={112}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="order-1 mx-auto flex h-72 w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-stone-50 to-white sm:h-80 md:h-96 lg:mx-0 lg:h-[28rem] lg:max-w-none">
                      {images.length > 0 ? (
                        <img
                          key={images[activeImage]}
                          src={productImageUrl(images[activeImage], 'main')}
                          alt={product?.name}
                          width={900}
                          height={900}
                          decoding="async"
                          fetchPriority="high"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="h-full w-full animate-fade-in object-contain p-4 sm:p-6"
                        />
                      ) : (
                        <p className="text-sm text-stone-400">No image available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product details */}
                <div
                  className="flex flex-col p-6 sm:p-8 lg:sticky lg:self-start lg:p-10"
                  style={{ top: stickyTop }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {product?.brand && (
                      <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                        {product.brand}
                      </span>
                    )}
                    {product?.category && (
                      <Link
                        to={`/products-filters?category=${product.category}`}
                        className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium capitalize text-stone-600 hover:bg-stone-200"
                      >
                        {product.category}
                      </Link>
                    )}
                    {inStock ? (
                      <span
                        className={classNames(
                          'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium',
                          lowStock ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                        )}
                      >
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        {lowStock ? `${product.qtyLeft} left` : 'In stock'}
                      </span>
                    ) : (
                      <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                        Out of stock
                      </span>
                    )}
                  </div>

                  <h1 className="mt-4 text-2xl font-bold leading-tight text-stone-900 sm:text-3xl lg:text-[1.75rem] xl:text-3xl">
                    {product?.name}
                  </h1>

                  <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <p className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                        {formatPrice(product?.price)}
                      </p>
                      <WishlistButton product={product} size="md" className="mt-1" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <StarIcon
                            key={i}
                            className={classNames(
                              rating > i ? 'text-amber-400' : 'text-stone-200',
                              'h-5 w-5'
                            )}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {rating > 0 ? `${rating} / 5` : 'No ratings'}
                        {reviewCount > 0 && ` · ${reviewCount} reviews`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Color{selectedColor ? ` · ${selectedColor}` : ''}
                      </p>
                      <RadioGroup value={selectedColor} onChange={setSelectedColor} className="mt-2.5">
                        <div className="flex flex-wrap gap-2.5">
                          {product?.colors?.map((color) => (
                            <RadioGroup.Option
                              key={color}
                              value={color}
                              className={({ checked }) =>
                                classNames(
                                  checked ? 'ring-2 ring-indigo-600 ring-offset-2' : '',
                                  'cursor-pointer rounded-full p-0.5 focus:outline-none'
                                )
                              }
                            >
                              <RadioGroup.Label as="span" className="sr-only">
                                {color}
                              </RadioGroup.Label>
                              <span
                                style={{ backgroundColor: colorHexMap[color] || color }}
                                title={color}
                                className="block h-10 w-10 rounded-full border border-stone-300 shadow-sm"
                              />
                            </RadioGroup.Option>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {showSizeSelector && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          {sizeLabel}
                          {selectedSize ? ` · ${selectedSize}` : ''}
                        </p>
                        <RadioGroup value={selectedSize} onChange={setSelectedSize} className="mt-2.5">
                          <div className="flex flex-wrap gap-2">
                            {product?.sizes?.map((size) => (
                              <RadioGroup.Option
                                key={size}
                                value={size}
                                className={({ checked }) =>
                                  classNames(
                                    checked
                                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                      : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300',
                                    product?.sizeMeasurementType === 'apparel'
                                      ? 'min-w-[3rem] uppercase'
                                      : 'min-w-[2.5rem]',
                                    'cursor-pointer rounded-lg border px-4 py-2.5 text-center text-sm font-semibold'
                                  )
                                }
                              >
                                <RadioGroup.Label as="span">{size}</RadioGroup.Label>
                              </RadioGroup.Option>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Quantity
                        </p>
                        <div className="mt-2.5 inline-flex rounded-xl border border-stone-200 bg-stone-50">
                          <button
                            type="button"
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="rounded-l-xl px-4 py-2.5 text-lg text-stone-600 hover:bg-white"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="flex min-w-[2.75rem] items-center justify-center border-x border-stone-200 px-3 text-base font-semibold text-stone-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(Math.min(product?.qtyLeft || 1, qty + 1))}
                            disabled={!inStock || qty >= (product?.qtyLeft || 1)}
                            className="rounded-r-xl px-4 py-2.5 text-lg text-stone-600 hover:bg-white disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                    <button
                      type="button"
                      onClick={addToCartHandler}
                      disabled={!inStock}
                      className={classNames(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-md transition-all duration-300',
                        inStock
                          ? 'bg-indigo-600 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                          : 'cursor-not-allowed bg-stone-400'
                      )}
                    >
                      {inStock && <ShoppingCartIcon className="h-5 w-5" />}
                      {inStock ? 'Add to cart' : 'Out of stock'}
                    </button>
                    {cartUnitCount > 0 && (
                      <Link
                        to="/shopping-cart"
                        className="flex flex-1 items-center justify-center rounded-xl border-2 border-stone-900 py-3.5 text-base font-semibold text-stone-900 transition hover:bg-stone-50"
                      >
                        Cart ({cartUnitCount})
                      </Link>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-stone-100 pt-6">
                    {policies.map((policy) => (
                      <div key={policy.name} className="flex gap-2.5 rounded-xl bg-stone-50 p-3">
                        <policy.icon className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-semibold text-stone-800">{policy.name}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                            {policy.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isLoggedIn) setShowReviewModal(true)
                      else document.getElementById('reviews-heading')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {isLoggedIn ? 'Write a review' : 'See customer reviews'} ↓
                  </button>
                </div>
              </div>
            </div>

            {/* Description — only shown here (not duplicated in hero) */}
            {product?.description && (
              <section className="mt-8 animate-fade-up rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-stone-900">Product description</h2>
                <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-stone-600">
                  {product.description}
                </p>
              </section>
            )}

            <SimilarProductsSection productId={product?._id} />

            {/* Reviews */}
        <section
          aria-labelledby="reviews-heading"
          className="mt-8 animate-fade-up rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="reviews-heading" className="text-2xl font-bold text-stone-900">
                Customer reviews
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {reviewCount} total · average {rating || '—'} / 5
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Write a review
                </button>
              )}
              {/* Sort controls */}
              {visibleReviews.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500">Sort:</span>
                  <button
                    type="button"
                    onClick={() => setReviewSort(reviewSort === 'desc' ? '' : 'desc')}
                    className={classNames(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      reviewSort === 'desc'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    )}
                  >
                    High → Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewSort(reviewSort === 'asc' ? '' : 'asc')}
                    className={classNames(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      reviewSort === 'asc'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
            <div className="rounded-xl border-2 border-dashed border-stone-200 py-12 text-center">
              <p className="text-stone-500">
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
                  className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  {/* Top row: user info + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {review.user?.fullname?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {review.user?.fullname}
                        </p>
                        <p className="text-xs text-stone-400">
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
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit review"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete review"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <StarIcon
                        key={i}
                        className={classNames(
                          review.rating > i
                            ? 'text-amber-400'
                            : 'text-stone-200',
                          'h-4 w-4'
                        )}
                      />
                    ))}
                    <span className="ml-1 text-xs font-medium text-stone-500">
                      {review.rating}/5
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-stone-600 leading-relaxed">
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
          </>
        )}
      </main>

      {/* Review Modal — used for both Create and Edit */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 animate-fade-in bg-black/40 transition-opacity"
            onClick={() => {
              setShowReviewModal(false)
              setEditingReview(null)
              setEditForm({ rating: '', message: '' })
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-stone-900">
                  {editingReview ? 'Edit Your Review' : 'Write a Review'}
                </h3>
                <button
                  onClick={() => {
                    setShowReviewModal(false)
                    setEditingReview(null)
                    setEditForm({ rating: '', message: '' })
                  }}
                  className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
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
                  <label className="block text-sm font-medium text-stone-700 mb-2">
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
                              ? 'text-amber-400'
                              : 'text-stone-200',
                            'h-8 w-8 cursor-pointer hover:text-amber-300 transition-colors'
                          )}
                        />
                      </button>
                    ))}
                    {(editingReview ? editForm.rating : reviewForm.rating) > 0 && (
                      <span className="ml-2 text-sm text-stone-500">
                        {editingReview ? editForm.rating : reviewForm.rating} / 5
                      </span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
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
                    className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    className="rounded-lg bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200 transition-colors"
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
