import { Fragment, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Dialog, Transition } from '@headlessui/react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bars3CenterLeftIcon,
  ScaleIcon,
  XMarkIcon,
  Squares2X2Icon,
  SwatchIcon,
  BuildingStorefrontIcon,
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ArrowUturnLeftIcon,
  PlusCircleIcon,
  TicketIcon,
  ReceiptPercentIcon,
  FolderPlusIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { logoutAction } from '../../redux/slices/users/usersSlice'
import user from './user.png'

const navSections = [
  {
    title: 'Orders',
    links: [
      { name: 'Dashboard', href: '', icon: HomeIcon, end: true },
      { name: 'Customers', href: 'customers', icon: UsersIcon },
      { name: 'All Orders', href: 'all-orders', icon: ClipboardDocumentListIcon },
      { name: 'Return Requests', href: 'return-requests', icon: ArrowUturnLeftIcon },
    ],
  },
  {
    title: 'Products',
    links: [
      { name: 'Add Product', href: 'add-product', icon: PlusCircleIcon },
      { name: 'Manage Stock', href: 'manage-products', icon: ScaleIcon },
    ],
  },
  {
    title: 'Coupons',
    links: [
      { name: 'Add Coupon', href: 'add-coupon', icon: TicketIcon },
      { name: 'Manage Coupons', href: 'manage-coupon', icon: ReceiptPercentIcon },
    ],
  },
  {
    title: 'Catalog',
    links: [
      { name: 'Add Category', href: 'add-category', icon: FolderPlusIcon },
      { name: 'All Categories', href: 'manage-category', icon: Squares2X2Icon },
      { name: 'All Colors', href: 'all-colors', icon: SwatchIcon },
      { name: 'All Brands', href: 'all-brands', icon: BuildingStorefrontIcon },
    ],
  },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const adminSidebarScrollClass =
  'admin-sidebar-scroll overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgb(71_85_105)_transparent]'

function SidebarNav({ onNavigate }) {
  return (
    <nav className={`flex-1 space-y-5 px-3 py-4 ${adminSidebarScrollClass}`} aria-label="Admin">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.links.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  classNames(
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function SidebarBrand() {
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <Squares2X2Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-white">ShopAI</p>
        <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-300">
          Admin Console
        </p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { userAuth } = useSelector((state) => state?.users)
  const currentUser = userAuth?.userInfo
  const fullname = currentUser?.fullname || 'Admin'
  const email = currentUser?.email || ''
  const dateJoined = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString()
    : 'N/A'
  const role = currentUser?.isAdmin ? 'Admin' : 'User'

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    dispatch(logoutAction()).then(() => navigate('/', { replace: true }))
  }

  const sidebarFooter = (
    <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
      <Link
        to="/"
        className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
      >
        <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0" />
        Back to store
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
        Sign out
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-900">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarBrand />
                <SidebarNav onNavigate={() => setSidebarOpen(false)} />
                {sidebarFooter}
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 shrink-0" aria-hidden="true" />
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar — full height */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-full flex-col bg-slate-900">
          <SidebarBrand />
          <SidebarNav />
          {sidebarFooter}
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-stone-200 bg-white/90 px-3 backdrop-blur sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3CenterLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <p className="truncate text-sm font-semibold text-stone-800 lg:hidden">ShopAI Admin</p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/admin/developer-analytics/inference"
              className="hidden items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:inline-flex"
            >
              <ChartBarIcon className="h-4 w-4" />
              Analytics
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 sm:px-3"
              title="Back to store"
            >
              <HomeIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Store</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg p-2 text-stone-600 transition-colors hover:bg-red-50 hover:text-red-600 sm:px-3"
              title="Sign out"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 pb-10">
          {/* Profile header */}
          <div className="border-b border-stone-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    className="h-14 w-14 shrink-0 rounded-full ring-2 ring-stone-100 sm:h-16 sm:w-16"
                    src={user}
                    alt="admin"
                  />
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold text-stone-900 sm:text-2xl">
                      Hello {fullname}!
                    </h1>
                    <dl className="mt-1 flex flex-col gap-x-5 gap-y-1 text-sm text-stone-500 sm:flex-row sm:flex-wrap">
                      <dd className="flex items-center gap-1.5">
                        <UsersIcon className="h-4 w-4 shrink-0 text-stone-400" />
                        Role: {role}
                      </dd>
                      {email && (
                        <dd className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{email}</span>
                        </dd>
                      )}
                      <dd className="flex items-center gap-1.5">
                        Joined: {dateJoined}
                      </dd>
                    </dl>
                  </div>
                </div>
                <Link
                  to="/admin/developer-analytics/inference"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 sm:hidden"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  Developer Analytics
                </Link>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
