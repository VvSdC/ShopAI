import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrdersAction, updateOrderAction } from "../../../redux/slices/orders/ordersSlices";
import { isAdminOrderStatusLocked, adminOrderStatusLockReason } from "../../../utils/orderDisplay";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import NoDataFound from "../../NoDataFound/NoDataFound";

export default function AllOrders() {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('none');
  const [searchId, setSearchId] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);

  useEffect(() => {
    dispatch(fetchOrdersAction());
  }, [dispatch]);

  const { error, loading, orders: { orders } = {} } = useSelector((state) => state?.orders || {});

  // derive filtered/sorted/searched list
  const filtered = (orders || []).filter((o) => {
    // payment status filter
    if (filterStatus === 'All') return true;
    const ps = (o?.paymentStatus || '').toString().toLowerCase();
    if (filterStatus === 'Paid') return ps !== 'not paid' && ps !== 'pending';
    if (filterStatus === 'Not paid') return ps === 'not paid';
    if (filterStatus === 'Pending') return ps === 'pending';
    return true;
  }).filter((o) => {
    // search by id (partial match)
    if (!searchId || searchId.trim() === '') return true;
    return o?._id?.toString().includes(searchId.trim());
  });

  const sorted = filtered.slice().sort((a, b) => {
    if (sortOrder === 'amount-asc') return (a.totalPrice || 0) - (b.totalPrice || 0);
    if (sortOrder === 'amount-desc') return (b.totalPrice || 0) - (a.totalPrice || 0);
    // default: newest first
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      {error && <ErrorMsg message={error?.message} />}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center"></div>
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium leading-6 text-stone-900">
            All Orders
          </h3>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">Payment:</label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="rounded border px-2 py-1">
              <option>All</option>
              <option>Paid</option>
              <option>Not paid</option>
              <option>Pending</option>
            </select>
            <label className="text-sm sm:ml-4">Sort:</label>
            <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setPage(1); }} className="rounded border px-2 py-1">
              <option value="none">Newest</option>
              <option value="amount-asc">Amount ↑</option>
              <option value="amount-desc">Amount ↓</option>
            </select>
            <label className="text-sm sm:ml-4">Per page:</label>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="rounded border px-2 py-1">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input placeholder="Search order id" value={searchId} onChange={(e) => setSearchId(e.target.value)} className="rounded border px-2 py-1" />
            <button onClick={() => setPage(1)} className="rounded bg-cyan-600 text-white px-3 py-1">Search</button>
            <button onClick={() => { setSearchId(''); setFilterStatus('All'); setSortOrder('none'); setPerPage(10); setPage(1); }} className="rounded border px-3 py-1">Clear</button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-300">
            <thead className="bg-stone-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-stone-900 sm:pl-6">Order ID</th>
                <th className="hidden px-3 py-3.5 text-left text-sm font-semibold text-stone-900 lg:table-cell">Payment Status</th>
                <th className="hidden px-3 py-3.5 text-left text-sm font-semibold text-stone-900 sm:table-cell">Order Date</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">Status</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">Total</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="py-6">
                    <LoadingComponent />
                  </td>
                </tr>
              </tbody>
            ) : total === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="py-6">
                    <NoDataFound />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-stone-200 bg-white">
                {paginated.map((order) => (
                  <tr key={order._id}>
                    <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-stone-900 sm:w-auto sm:max-w-none sm:pl-6">{order._id}</td>
                    <td className="hidden px-3 py-4 text-sm text-stone-500 lg:table-cell">{order.paymentStatus}</td>
                    <td className="hidden px-3 py-4 text-sm text-stone-500 lg:table-cell">{new Date(order?.createdAt).toLocaleDateString()}</td>
                    <td className="hidden px-3 py-4 text-sm text-stone-500 sm:table-cell">{order?.status}</td>
                    <td className="px-3 py-4 text-sm text-stone-500">{order?.totalPrice}</td>
                    <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      {isAdminOrderStatusLocked(order) ? (
                        <span
                          className="text-stone-300 cursor-not-allowed"
                          title={adminOrderStatusLockReason(order)}
                        >
                          Edit
                        </span>
                      ) : editingOrderId === order?._id ? (
                        <select
                          autoFocus
                          defaultValue={order?.status}
                          onChange={(e) => {
                            dispatch(updateOrderAction({ status: e.target.value, id: order?._id })).then(() => {
                              setEditingOrderId(null);
                              dispatch(fetchOrdersAction());
                            });
                          }}
                          onBlur={() => setEditingOrderId(null)}
                          className="rounded-md border border-stone-300 py-1 pl-2 pr-7 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingOrderId(order?._id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* pagination controls */}
        {total > perPage && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:justify-end">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Previous
              </button>
              <div className="px-4 py-2">Page {page} / {totalPages}</div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
