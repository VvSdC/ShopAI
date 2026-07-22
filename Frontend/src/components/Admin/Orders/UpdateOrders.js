import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { fetchOderAction, updateOrderAction } from "../../../redux/slices/orders/ordersSlices";
import { isAdminOrderStatusLocked, adminOrderStatusLockReason, getOrderDisplayStatus, getOrderDisplayStatusColor, orderFulfillmentStatus } from "../../../utils/orderDisplay";
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
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <Link to="/admin/all-orders" className="text-sm text-indigo-600 hover:text-indigo-500">
          ← Back to all orders
        </Link>
        <p className="mt-4 text-sm font-medium text-stone-700">Customer-facing status</p>
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getOrderDisplayStatusColor(order)}`}
        >
          {getOrderDisplayStatus(order).displayStatusLabel}
        </span>
        <p className="mt-1 text-xs text-stone-500">
          Fulfillment: {getOrderDisplayStatus(order).fulfillmentStatus}
          {order?.refundStatus && order.refundStatus !== 'none'
            ? ` · Refund: ${order.refundStatus}`
            : ''}
          {order?.returnRequestStatus ? ` · Return: ${order.returnRequestStatus}` : ''}
        </p>
        <label htmlFor="location" className="block text-sm font-medium text-stone-700 mt-4">
          Update fulfillment status
        </label>
        {locked ? (
          <p className="mt-2 text-sm text-stone-500">{adminOrderStatusLockReason(order)}</p>
        ) : (
          <select
            id="location"
            name="status"
            onChange={onChange}
            value={orderFulfillmentStatus(order) || "pending"}
            className="mt-1 block w-full rounded-md border-2 border-stone-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default UpdateOrders;
