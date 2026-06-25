import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import SuccessMsg from "../../SuccessMsg/SuccessMsg";
import { createCouponAction } from "../../../redux/slices/coupons/couponsSlice";
import { useDispatch, useSelector } from "react-redux";
import { serializeCouponDates, startOfDay } from "../../../utils/couponDates";

export default function AddCoupon() {
  const dispatch = useDispatch();
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [formData, setFormData] = useState({
    code: "",
    discount: "",
  });

  //---onHandleChange---
  const onHandleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  //---onHandleSubmit---
  const onHandleSubmit = (e) => {
    e.preventDefault();
    const dates = serializeCouponDates(startDate, endDate);
    dispatch(
      createCouponAction({
        discount: formData?.discount,
        code: formData?.code,
        ...dates,
      })
    );
    //reset form
    setFormData({
      code: "",
      discount: "",
    });
  };
  //---coupon from store---
  const { loading, isAdded, error, coupon } = useSelector(
    (state) => state?.coupons
  );
  console.log(loading, isAdded, error, coupon);
  return (
    <>
      {error && <ErrorMsg message={error?.message} />}
      {isAdded && (
        <SuccessMsg
          message="
       Bravo, coupon created successfuly
      "
        />
      )}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-center text-2xl font-extrabold text-stone-900 sm:text-3xl">
            Add New Coupon
          </h2>
          <form className="mt-8 space-y-6" onSubmit={onHandleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  {/* name */}
                  Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={onHandleChange}
                    className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  {/* discount */}
                  Discount (in %)
                </label>
                <div className="mt-1">
                  <input
                    name="discount"
                    value={formData.discount}
                    onChange={onHandleChange}
                    type="number"
                    className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            {/* start date */}
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Start Date
              </label>
              <div className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(startOfDay(date))}
                  minDate={today}
                  dateFormat="dd/MM/yyyy"
                />
                <p className="mt-1 text-xs text-stone-500">
                  Starts at the beginning of the selected day (today is allowed).
                </p>
              </div>
            </div>

            {/* end date */}
            <div>
              <label className="block text-sm font-medium text-stone-700">
                End Date
              </label>
              <div className="appearance-none block w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm placeholder-stone-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  minDate={startDate}
                  dateFormat="dd/MM/yyyy"
                />
                <p className="mt-1 text-xs text-stone-500">
                  Valid through the end of the selected day.
                </p>
              </div>
            </div>
            <div>
              {loading ? (
                <LoadingComponent />
              ) : (
                <button
                  type="submit"
                  className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Add Coupon
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
