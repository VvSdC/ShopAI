import { useDispatch, useSelector } from 'react-redux'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import {
  selectIsInWishlist,
  toggleWishlistItemAction,
} from '../../../redux/slices/wishlist/wishlistSlice'
import { wishlistProductFromCatalog } from '../../../utils/localWishlist'

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
}

const iconClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
}

export default function WishlistButton({ product, size = 'sm', className = '' }) {
  const dispatch = useDispatch()
  const productId = product?._id || product?.id
  const saved = useSelector((state) => selectIsInWishlist(state, productId))
  const loading = useSelector((state) => state?.wishlists?.loading)

  if (!productId) return null

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const snapshot = wishlistProductFromCatalog(product)
    if (!snapshot) return
    dispatch(toggleWishlistItemAction(snapshot))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`inline-flex items-center justify-center rounded-full border bg-white/95 shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${
        saved
          ? 'border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50'
          : 'border-stone-200 text-stone-500 hover:border-rose-200 hover:text-rose-600'
      } ${sizeClasses[size] || sizeClasses.sm} ${className}`}
    >
      {saved ? (
        <HeartIconSolid className={iconClasses[size] || iconClasses.sm} aria-hidden="true" />
      ) : (
        <HeartIcon className={iconClasses[size] || iconClasses.sm} aria-hidden="true" />
      )}
    </button>
  )
}
