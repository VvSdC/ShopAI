import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { OrdersStatsAction } from '../../../redux/slices/orders/ordersSlices'
import LoadingComponent from '../../LoadingComp/LoadingComponent'

const statCards = [
  { key: 'today', label: "Today's sales", headerClass: 'bg-indigo-600' },
  { key: 'min', label: 'Minimum order', headerClass: 'bg-slate-600' },
  { key: 'max', label: 'Maximum order', headerClass: 'bg-slate-700' },
  { key: 'total', label: 'Total sales', headerClass: 'bg-indigo-700' },
]

export default function OrdersStats() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(OrdersStatsAction())
  }, [dispatch])

  const { stats, loading, error } = useSelector((state) => state?.orders)
  const agg = stats?.orders?.[0] ?? {}
  const today = stats?.saleToday?.[0] ?? {}

  if (loading) return <LoadingComponent />
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error?.message || 'Failed to load statistics'}
      </div>
    )
  }

  const fmt = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—')
  const values = [
    fmt(today.totalSales ?? 0),
    fmt(agg.minimumSale),
    fmt(agg.maxSale),
    fmt(agg.totalSales),
  ]

  return (
    <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, i) => (
        <div
          key={card.key}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className={`${card.headerClass} px-4 py-3`}>
            <dt className="text-sm font-medium text-white">{card.label}</dt>
          </div>
          <dd className="px-4 py-5 text-2xl font-bold text-gray-900">{values[i]}</dd>
        </div>
      ))}
    </dl>
  )
}
