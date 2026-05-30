import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { fetchOderAction, updateOrderAction } from "../../../redux/slices/orders/ordersSlices";
import { isAdminOrderStatusLocked, adminOrderStatusLockReason } from "../../../utils/orderDisplay";
import LoadingComponent from "../../LoadingComp/LoadingComponent";

const UpdateOrders = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { order: orderPayload, loading } = useSelector((state) => state?.orders || {});
  const order = orderPayload?.order;

  useEffect(() => {
    dispatch(fetchOderAction(id));
  }, [dispatch, id]);

  const onChange = (e) => {
    dispatch(updateOrderAction({ status: e.target.value, id }));
    window.location.href = "/admin/all-orders";
  };

  if (loading) return <LoadingComponent />;

  const locked = isAdminOrderStatusLocked(order);

  return (
    <div className="mt-6 flex items-center space-x-4 divide-x divide-gray-200 border-t border-gray-200 pt-4 text-sm font-medium sm:mt-0 sm:ml-4 sm:border-none sm:pt-0">
      <div className="flex flex-1 justify-center">
        <div>
          <Link to="/admin/all-orders" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to all orders
          </Link>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mt-4">
            Update Order
          </label>
          {locked ? (
            <p className="mt-2 text-sm text-gray-500">{adminOrderStatusLockReason(order)}</p>
          ) : (
            <select
              id="location"
              name="status"
              onChange={onChange}
              value={order?.status || "pending"}
              className="mt-1 block w-full rounded-md border-2 border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateOrders;
