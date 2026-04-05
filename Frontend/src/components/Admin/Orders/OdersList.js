import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchOrdersAction } from "../../../redux/slices/orders/ordersSlices";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import NoDataFound from "../../NoDataFound/NoDataFound";
import OrdersStats from "./OrdersStatistics";


export default function OrdersList() {
  //dispatch
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchOrdersAction());
  }, [dispatch]);
  //get data from store
  const {
    error,
    loading,
    orders: { orders },
  } = useSelector((state) => state?.orders);
  // Show only recent successful (paid) orders on dashboard
  const recentSuccessful = (orders || [])
    .filter((o) => {
      const status = (o?.paymentStatus || '').toString().toLowerCase();
      return status && status !== 'not paid' && status !== 'pending';
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return (
    <>
      {error && <ErrorMsg message={error?.message} />}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center"></div>
        {/* order stats */}
        <OrdersStats />

        <div style={{textAlign:'center',marginTop:'60px'}}>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mt-3">
            Recent Oders
          </h3>
        </div>
        <div className="-mx-4 mt-3  overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:-mx-6 md:mx-0 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Order ID
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell">
                  Payment Status
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell">
                  Oder Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>

                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Total
                </th>
                {/* <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Edit</span>
              </th> */}
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
            ) : (orders?.length <= 0 || recentSuccessful?.length <= 0) ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="py-6">
                    <NoDataFound />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-gray-200 bg-white">
                {recentSuccessful?.map((order) => (
                  <tr key={order._id}>
                    <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6">
                      {order._id}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell">{order.paymentStatus}</td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell">{new Date(order?.createdAt).toLocaleDateString()}</td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">{order?.status}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">{order?.totalPrice}</td>
                    <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <Link to={`/admin/orders/${order?._id}`} className="text-indigo-600 hover:text-indigo-900">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
