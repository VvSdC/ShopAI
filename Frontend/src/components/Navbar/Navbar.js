import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Dialog, Popover, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  HeartIcon,
  ShoppingCartIcon,
  UserIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import ShopAILogo from './ShopAILogo'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCategoriesAction } from '../../redux/slices/categories/categoriesSlice'
import { syncAndLoadCartAction, clearCartAction } from '../../redux/slices/cart/cartSlices'
import { syncAndLoadWishlistAction } from '../../redux/slices/wishlist/wishlistSlice'
import {
  isRecentPostCheckout,
  clearPostCheckoutFlag,
} from '../../utils/postCheckout'
import { logoutAction, getCurrentUserAction } from '../../redux/slices/users/usersSlice'
import { fetchActiveCouponAction } from '../../redux/slices/coupons/couponsSlice'
import { isPromoActive, navbarPromoText } from '../../utils/promoMessaging'
import ProductSearchBar from '../Users/Products/ProductSearchBar'
import { getCartUnitCount } from '../../utils/cartCount'
import { getWishlistCount } from '../../utils/wishlistCount'
import { ASSISTANT_PATH, assistantStartNewState } from '../ChatBot/assistantNavigation'

function categoryProductCount(category) {
  return category?.productCount ?? 0
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  //dispatch
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchCategoriesAction())
    dispatch(getCurrentUserAction())
  }, [dispatch])
  //get data from store
  const { categories } = useSelector((state) => state?.categories)

  // compute top categories by number of products
  const sortedCategories = (categories?.categories || []).slice().sort((a, b) => {
    return categoryProductCount(b) - categoryProductCount(a)
  })
  const categoriesToDisplay = sortedCategories.slice(0, 4)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartCountReady, setCartCountReady] = useState(false)
  const [wishlistCountReady, setWishlistCountReady] = useState(false)
  const prevSearchRef = useRef('')

  // Close the mobile drawer on any navigation so the destination page is visible.
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, location.search])
  const { cartItems, listFetching } = useSelector((state) => state?.carts)
  const cartUnitCount = getCartUnitCount(cartItems)
  const showCartCount = cartCountReady && !listFetching
  const { items: wishlistItems, listFetching: wishlistFetching } = useSelector(
    (state) => state?.wishlists
  )
  const wishlistCount = getWishlistCount(wishlistItems)
  const showWishlistCount = wishlistCountReady && !wishlistFetching
  const { userAuth } = useSelector((state) => state?.users)
  const user = userAuth?.userInfo
  const isLoggedIn = userAuth?.isLoggedIn

  useEffect(() => {
    if (isLoggedIn && !user) {
      dispatch(getCurrentUserAction())
    }
  }, [dispatch, isLoggedIn, user])

  useEffect(() => {
    const isPaymentReturn =
      location.search.includes('payment=success') &&
      location.search.includes('session_id=')

    if (isPaymentReturn) {
      prevSearchRef.current = location.search
      setCartCountReady(true)
      return undefined
    }

    const wasPaymentReturn =
      prevSearchRef.current.includes('payment=success') &&
      prevSearchRef.current.includes('session_id=')
    prevSearchRef.current = location.search

    const postCheckout = isRecentPostCheckout()

    setCartCountReady(false)
    let cancelled = false

    const cartAction =
      wasPaymentReturn || postCheckout ? clearCartAction() : syncAndLoadCartAction()

    dispatch(cartAction)
      .finally(() => {
        if (!cancelled) {
          if (postCheckout) {
            clearPostCheckoutFlag()
          }
          setCartCountReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [dispatch, isLoggedIn, location.search])

  useEffect(() => {
    setWishlistCountReady(false)
    let cancelled = false
    dispatch(syncAndLoadWishlistAction()).finally(() => {
      if (!cancelled) setWishlistCountReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, isLoggedIn])

  //logout handler
  const logoutHandler = () => {
    dispatch(logoutAction()).then(() => {
      navigate('/', { replace: true })
    })
  }
  useEffect(() => {
    dispatch(fetchActiveCouponAction())
  }, [dispatch])
  const { activeCoupon: currentCoupon } = useSelector((state) => state?.coupons)
  const showPromoBar = isPromoActive(currentCoupon)

  const navRef = useRef(null)
  const [navHeight, setNavHeight] = useState(0)

  useLayoutEffect(() => {
    const el = navRef.current
    if (!el) return

    const syncHeight = () => {
      const heightPx = `${el.offsetHeight}px`
      setNavHeight(el.offsetHeight)
      document.documentElement.style.setProperty('--shopai-navbar-height', heightPx)
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--shopai-navbar-height')
    }
  }, [isLoggedIn, showPromoBar, currentCoupon?.code])

  return (
    <>
    <div
      ref={navRef}
      className="fixed inset-x-0 top-0 z-50 w-full bg-white shadow-sm"
    >
      {/* Mobile menu */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 lg:hidden"
          onClose={setMobileMenuOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel
                className="relative flex w-full max-w-xs flex-col overflow-y-auto bg-white pb-12 shadow-xl"
                onClick={(e) => {
                  // Close the drawer whenever a navigation link is tapped so the
                  // user lands on the new page without the sidebar covering it.
                  if (e.target.closest('a')) {
                    setMobileMenuOpen(false)
                  }
                }}
              >
                <div className="flex items-center justify-between px-4 pt-5 pb-2">
                  <ShopAILogo compact />
                  <button
                    type="button"
                    className="-m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close menu</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                {/* mobile category menu links */}
                <div className="border-t border-gray-200 px-4 py-4">
                  <ProductSearchBar
                    className="w-full"
                    inputId="navbar-mobile-search"
                    onSearch={(q) => {
                      setMobileMenuOpen(false)
                      if (q) {
                        navigate(`/products-filters?q=${encodeURIComponent(q)}`)
                      } else {
                        navigate('/products-filters')
                      }
                    }}
                  />
                </div>

                <div className="space-y-6 border-t border-gray-200 py-6 px-4">
                  {/* {navigation.pages.map((page) => (
                    <div key={page.name} className="flow-root">
                      <a
                        href={page.href}
                        className="-m-2 block p-2 font-medium text-gray-900">
                        {page.name}
                      </a>
                    </div>
                  ))} */}
                  {categoriesToDisplay?.length <= 0 ? (
                    <>
                      <Link
                        to="/products?category=clothing"
                        className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                      >
                        CLOTHING
                      </Link>

                      <Link
                        to="/"
                        className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                      >
                        MEN
                      </Link>

                      <Link
                        to="/"
                        className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                      >
                        WOMEN
                      </Link>
                    </>
                  ) : (
                    <>
                      {categoriesToDisplay?.map((category) => (
                        <Link
                          key={category?._id}
                          to={`/products-filters?category=${category?.name}`}
                          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                        >
                          {category?.image ? (
                            <img src={category.image} alt={category?.name} className="h-5 w-5 rounded-full object-cover mr-2" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-gray-200 mr-2" />
                          )}
                          <span className="uppercase">{category?.name}</span>
                          <span className="ml-2 text-xs text-gray-500">({categoryProductCount(category)})</span>
                        </Link>
                      ))}
                      <Link to="/all-categories" className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800">ALL CATEGORIES</Link>
                    </>
                  )}
                  <Link
                    to="/about"
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
                  >
                    ABOUT
                  </Link>
                  <Link
                    to={ASSISTANT_PATH}
                    state={assistantStartNewState}
                    className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    SHOP WITH AI
                  </Link>
                </div>

                {/* mobile links register/login */}
                <div className="space-y-6 border-t border-gray-200 py-6 px-4">
                  {!isLoggedIn && (
                    <>
                      <div className="flow-root">
                        <Link
                          to="/register"
                          className="-m-2 block p-2 font-medium text-gray-900"
                        >
                          Create an account
                        </Link>
                      </div>
                      <div className="flow-root">
                        <Link
                          to="/login"
                          className="-m-2 block p-2 font-medium text-gray-900"
                        >
                          Sign in
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-6 border-t border-gray-200 py-6 px-4"></div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <header>
        <nav aria-label="Top">
          {/* Top bar — register / login (desktop, logged out) */}
          {!isLoggedIn && (
            <div className="hidden bg-gray-800 lg:block">
              <div className="mx-auto flex h-10 max-w-7xl items-center justify-end px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-6">
                  <Link
                    to="/register"
                    className="text-sm font-medium text-white hover:text-gray-100"
                  >
                    Create an account
                  </Link>
                  <span className="h-6 w-px bg-gray-600" aria-hidden="true" />
                  <Link
                    to="/login"
                    className="text-sm font-medium text-white hover:text-gray-100"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Main navigation */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex w-full flex-col lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:pl-5 lg:pr-6">
              <div className="flex h-16 w-full items-center justify-between gap-4 pl-3 pr-3 sm:pl-4 sm:pr-4 lg:h-auto lg:min-w-0 lg:flex-1 lg:justify-start lg:gap-6 lg:pl-0 lg:pr-0">
                {/* Mobile: menu + logo */}
                <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    className="-ml-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
                    onClick={() => setMobileMenuOpen((open) => !open)}
                    aria-expanded={mobileMenuOpen}
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  >
                    <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
                    {mobileMenuOpen ? (
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    )}
                  </button>
                  <ShopAILogo compact />
                </div>

                {/* Desktop: logo + nav links — nudged toward left edge */}
                <div className="hidden shrink-0 items-center gap-6 lg:flex xl:gap-8">
                  <ShopAILogo />
                  <Popover.Group as="div" className="flex items-center">
                    <Popover className="relative flex items-center">
                      {({ open }) => (
                        <>
                          <Popover.Button className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            <span>CATEGORIES</span>
                            <ChevronDownIcon
                              className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </Popover.Button>

                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                          >
                            <Popover.Panel className="absolute left-0 top-full z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="py-1">
                                {categoriesToDisplay?.length <= 0 ? (
                                  <div className="px-4 py-2 text-sm text-gray-700">NO CATEGORIES</div>
                                ) : (
                                  categoriesToDisplay.map((category) => (
                                    <Link
                                      key={category?._id}
                                      to={`/products-filters?category=${category?.name}`}
                                      className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-3">
                                        {category?.image ? (
                                          <img
                                            src={category.image}
                                            alt={category?.name}
                                            className="h-6 w-6 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-6 w-6 rounded-full bg-gray-200" />
                                        )}
                                        <span className="uppercase">{category?.name}</span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {categoryProductCount(category)}
                                      </span>
                                    </Link>
                                  ))
                                )}
                                <div className="my-1 border-t" />
                                <Link
                                  to="/all-categories"
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  ALL CATEGORIES
                                </Link>
                              </div>
                            </Popover.Panel>
                          </Transition>
                        </>
                      )}
                    </Popover>
                  </Popover.Group>
                  <Link
                    to="/about"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    About
                  </Link>
                  <Link
                    to={ASSISTANT_PATH}
                    state={assistantStartNewState}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Shop with AI
                  </Link>
                </div>

                {/* Desktop search */}
                <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex lg:max-w-xl">
                  <ProductSearchBar className="w-full" inputId="navbar-desktop-search" />
                </div>

                {/* Right: admin, profile, cart */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:pr-0">
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:px-4 sm:py-2 sm:text-sm"
                    >
                      Admin
                    </Link>
                  )}
                  {isLoggedIn && (
                    <div className="flex items-center gap-1">
                      <Link
                        to="/customer-profile"
                        className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-600"
                      >
                        <UserIcon className="h-6 w-6" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={logoutHandler}
                        className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-600"
                        aria-label="Log out"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-6 w-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  <span className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
                  <Link
                    to="/wishlist"
                    aria-label={
                      showWishlistCount
                        ? `Wishlist, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}`
                        : 'Wishlist'
                    }
                    className="group inline-flex items-center gap-2 rounded-md p-2 text-gray-700 hover:text-gray-900"
                  >
                    <HeartIcon
                      className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-rose-500"
                      aria-hidden="true"
                    />
                    {showWishlistCount ? (
                      <span className="text-sm font-medium">{wishlistCount}</span>
                    ) : (
                      <span
                        className="inline-block h-3.5 w-4 animate-pulse rounded bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                  <Link
                    to="/shopping-cart"
                    aria-label={
                      showCartCount
                        ? `Shopping cart, ${cartUnitCount} item${cartUnitCount === 1 ? '' : 's'}`
                        : 'Shopping cart'
                    }
                    className="group inline-flex items-center gap-2 rounded-md p-2 text-gray-700 hover:text-gray-900"
                  >
                    <ShoppingCartIcon
                      className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-gray-600"
                      aria-hidden="true"
                    />
                    {showCartCount ? (
                      <span className="text-sm font-medium">{cartUnitCount}</span>
                    ) : (
                      <span
                        className="inline-block h-3.5 w-4 animate-pulse rounded bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </div>
              </div>

              {/* Mobile search */}
              <div className="border-t border-stone-100 px-3 pb-3 pt-2 lg:hidden">
                <ProductSearchBar className="w-full" inputId="navbar-mobile-bar-search" />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {showPromoBar && (
        <div className="border-t border-indigo-800 bg-indigo-700">
          <div className="mx-auto flex h-10 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <p className="truncate text-center text-sm font-medium text-white">
              {navbarPromoText(currentCoupon)}
            </p>
          </div>
        </div>
      )}
    </div>
    {/* Reserve space so page content is not hidden under fixed navbar */}
    <div
      aria-hidden="true"
      className="shrink-0"
      style={{ height: navHeight > 0 ? navHeight : 'calc(4rem + 1px)' }}
    />
    </>
  )
}
