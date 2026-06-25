import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bars3CenterLeftIcon,
  XMarkIcon,
  CpuChipIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

const sidebarLinks = [
  { name: 'Inference', href: 'inference', icon: CpuChipIcon },
  { name: 'Evaluate Chatbot', href: 'chat-eval', icon: ChatBubbleLeftRightIcon },
  { name: 'Chat usage', href: 'chat-usage', icon: ChartBarIcon },
]

const adminSidebarScrollClass =
  'admin-sidebar-scroll overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgb(71_85_105)_transparent]'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function SidebarBrand() {
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <CpuChipIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-white">Developer</p>
        <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-300">
          Analytics
        </p>
      </div>
    </div>
  )
}

function SidebarBody({ onNavigate }) {
  return (
    <>
      <nav className={`flex-1 px-3 py-4 ${adminSidebarScrollClass}`} aria-label="Analytics">
        <div className="space-y-1">
          {sidebarLinks.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
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
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          to="/admin"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeftIcon className="h-5 w-5 shrink-0" />
          Back to Admin
        </Link>
      </div>
    </>
  )
}

export default function DeveloperAnalyticsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

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
                <SidebarBrand />
                <SidebarBody onNavigate={() => setSidebarOpen(false)} />
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 shrink-0" aria-hidden="true" />
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-full flex-col bg-slate-900">
          <SidebarBrand />
          <SidebarBody />
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-stone-200 bg-white/90 px-3 backdrop-blur sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3CenterLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <p className="truncate text-sm font-semibold text-stone-800">Developer Analytics</p>
          <Link
            to="/admin"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Admin</span>
          </Link>
        </header>

        <main className="flex-1 pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
