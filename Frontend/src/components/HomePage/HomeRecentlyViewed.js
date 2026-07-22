import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecentlyViewed } from '../../utils/recentlyViewed'
import { formatPrice } from '../Users/Products/cartDisplay'
import Reveal from './Reveal'

export default function HomeRecentlyViewed() {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  if (!items.length) return null

  return (
    <section className="border-t border-stone-200 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Recently viewed
          </h2>
          <p className="mt-1.5 text-sm text-stone-600">Pick up where you left off on this device.</p>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => (
            <Link
              key={item._id}
              to={`/products/${item._id}`}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="aspect-square bg-white p-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-stone-400">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-indigo-700">
                  {item.name}
                </p>
                <p className="mt-1 text-sm font-bold text-stone-800">{formatPrice(item.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
