import { Fragment, useState } from 'react'
import { useSelector } from 'react-redux'
import { Dialog, Transition } from '@headlessui/react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Bars3CenterLeftIcon,
  XMarkIcon,
  CpuChipIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import user from '../user.png'

const sidebarLinks = [
  {
    name: 'Inference',
    href: 'inference',
    icon: CpuChipIcon,
  },
]

const adminSidebarScrollClass =
  'admin-sidebar-scroll overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgb(71_85_105)_transparent]'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function SidebarLinks({ onNavigate }) {
  const location = useLocation()

  return sidebarLinks.map((item) => {
    const target = `/admin/developer-analytics/${item.href}`
    const isActive = location.pathname.endsWith(`/${item.href}`)

    return (
      <Link
        key={item.name}
        to={target}
        onClick={onNavigate}
        className={classNames(
          isActive
            ? 'bg-indigo-700 text-white'
            : 'text-slate-200 hover:bg-indigo-600 hover:text-white',
          'group flex items-center rounded-md px-2 py-2 text-sm font-medium leading-6'
        )}
      >
        <item.icon
          className="mr-4 h-6 w-6 flex-shrink-0 text-slate-400"
          aria-hidden="true"
        />
        {item.name}
      </Link>
    )
  })
}

export default function DeveloperAnalyticsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { userAuth } = useSelector((state) => state?.users)
  const currentUser = userAuth?.userInfo
  const fullname = currentUser?.fullname || 'Admin'

  return (
    <div className="min-h-full">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 lg:hidden"
          onClose={setSidebarOpen}
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
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
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
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-900 pb-4">
                <div
                  className="flex flex-1 flex-col"
                  style={{ paddingTop: 'var(--shopai-navbar-height, calc(4rem + 1px))' }}
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

                <div className="px-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Developer Analytics
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-white">ShopAI Console</p>
                </div>

                <nav
                  className={`mt-5 flex flex-1 flex-col ${adminSidebarScrollClass}`}
                  aria-label="Analytics sidebar"
                >
                  <div className="space-y-1 px-2">
                    <SidebarLinks onNavigate={() => setSidebarOpen(false)} />
                  </div>
                  <div className="mt-6 px-2">
                    <Link
                      to="/admin"
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center rounded-md px-2 py-2 text-sm font-medium leading-6 text-slate-200 hover:bg-indigo-600 hover:text-white"
                    >
                      <ArrowLeftIcon className="mr-4 h-6 w-6 text-slate-400" />
                      Back to Admin
                    </Link>
                  </div>
                </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:bg-slate-900">
        <div
          className={`flex flex-grow flex-col pb-4 ${adminSidebarScrollClass}`}
          style={{ paddingTop: 'var(--shopai-navbar-height, calc(4rem + 1px))' }}
        >
          <div className="border-b border-slate-800 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Developer Analytics
            </p>
            <p className="mt-0.5 text-sm font-medium text-white">ShopAI Console</p>
          </div>
          <nav
            className={`mt-5 flex flex-1 flex-col ${adminSidebarScrollClass}`}
            aria-label="Analytics sidebar"
          >
            <div className="space-y-1 px-2">
              <SidebarLinks />
            </div>
            <div className="mt-6 px-2">
              <Link
                to="/admin"
                className="group flex items-center rounded-md px-2 py-2 text-sm font-medium leading-6 text-slate-200 hover:bg-indigo-600 hover:text-white"
              >
                <ArrowLeftIcon className="mr-4 h-6 w-6 text-slate-400" />
                Back to Admin
              </Link>
            </div>
          </nav>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <div className="flex h-16 flex-shrink-0 border-b border-gray-200 bg-white lg:border-none">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3CenterLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <main className="flex-1 bg-gray-50 pb-8">
          <div className="bg-white shadow">
            <div className="px-4 sm:px-6 lg:mx-auto lg:max-w-6xl lg:px-8">
              <div className="py-6 md:flex md:items-center md:justify-between lg:border-t lg:border-gray-200">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <img
                      className="hidden h-16 w-16 rounded-full sm:block"
                      src={user}
                      alt="admin"
                    />
                    <div>
                      <div className="flex items-center">
                        <img
                          className="h-16 w-16 rounded-full sm:hidden"
                          src={user}
                          alt=""
                        />
                        <div className="ml-3">
                          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:leading-9">
                            Developer Analytics
                          </h1>
                          <p className="mt-1 text-sm text-gray-500">
                            Signed in as {fullname}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
