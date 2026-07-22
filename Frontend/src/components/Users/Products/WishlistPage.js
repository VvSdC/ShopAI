import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeftIcon,
  EyeIcon,
  HeartIcon,
  ShoppingCartIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import {
  getWishlistFromLocalStorageAction,
  removeWishlistItemAction,
} from '../../../redux/slices/wishlist/wishlistSlice'
import { addOrderToCartaction } from '../../../redux/slices/cart/cartSlices'
import axiosInstance from '../../../utils/axiosInstance'
import PrivatePageSeo from '../../common/PrivatePageSeo'
import { formatPrice } from './cartDisplay'
import { resolveCartSize } from '../../../utils/sizeMeasurement'

function WishlistCard({ item, onRemove, onAddToCart, adding }) {
  const productPath = `/products/${item._id}`
  const outOfStock = item.inStock === false || (item.qtyLeft != null && item.qtyLeft <= 0)

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <div className="relative">
        <Link to={productPath} className="block aspect-square bg-stone-50 p-4">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-400">
              No image
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => onRemove(item._id)}
          className="absolute right-3 top-3 rounded-full border border-stone-200 bg-white/95 p-2 text-stone-500 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
          aria-label={`Remove ${item.name} from wishlist`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-md bg-stone-900/80 px-2 py-1 text-[11px] font-semibold text-white">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {item.brand && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            {item.brand}
          </p>
        )}
        <Link
          to={productPath}
          className="mt-1 line-clamp-2 text-sm font-semibold capitalize text-stone-900 hover:text-indigo-700"
        >
          {item.name}
        </Link>
        <p className="mt-2 text-lg font-bold text-stone-900">{formatPrice(item.price)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={outOfStock || adding}
            onClick={() => onAddToCart(item)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            {adding ? 'Adding…' : 'Add to cart'}
          </button>
          <Link
            to={productPath}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-indigo-200 hover:text-indigo-700"
          >
            <EyeIcon className="h-4 w-4" />
            View
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function WishlistPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, listFetching } = useSelector((state) => state?.wishlists)
  const [addingId, setAddingId] = useState(null)

  useEffect(() => {
    dispatch(getWishlistFromLocalStorageAction())
  }, [dispatch])

  const handleRemove = (productId) => {
    dispatch(removeWishlistItemAction(productId))
  }

  const handleAddToCart = async (item) => {
    setAddingId(item._id)
    try {
      const { data } = await axiosInstance.get(`/products/${item._id}`)
      const product = data?.product
      if (!product) throw new Error('Product not found')

      const color = product.colors?.[0] || 'Standard'
      const size = resolveCartSize(product, product.sizes?.[0] || '')

      await dispatch(
        addOrderToCartaction({
          _id: product._id,
          name: product.name,
          qty: 1,
          price: product.price,
          description: product.description,
          color,
          size,
          image: product.images?.[0] || item.image,
          totalPrice: product.price,
          qtyLeft: product.qtyLeft,
        })
      ).unwrap()

      navigate('/shopping-cart')
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Could not add to cart',
        text: err?.message || 'Open the product page to choose options.',
      })
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="min-h-full bg-stone-50 pb-10">
      <PrivatePageSeo title="Wishlist" path="/wishlist" />
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/products-filters"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-indigo-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Continue shopping
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <HeartIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Your wishlist</h1>
              <p className="mt-1 text-sm text-stone-600">
                Save items you love and come back when you are ready to buy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {listFetching && items.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-6 py-16 text-center text-stone-500">
            Loading your wishlist…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <HeartIcon className="mx-auto h-12 w-12 text-stone-300" />
            <h2 className="mt-4 text-lg font-semibold text-stone-900">Nothing saved yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
              Tap the heart on any product to save it here. No account needed — we will keep your
              list on this device until you sign in.
            </p>
            <Link
              to="/products-filters"
              className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-stone-600">
              {items.length} saved {items.length === 1 ? 'item' : 'items'}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <WishlistCard
                  key={item._id}
                  item={item}
                  onRemove={handleRemove}
                  onAddToCart={handleAddToCart}
                  adding={addingId === item._id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}