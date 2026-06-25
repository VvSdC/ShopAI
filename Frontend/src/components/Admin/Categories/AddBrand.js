import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { createBrandAction } from "../../../redux/slices/categories/brandsSlice";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import SuccessMsg from "../../SuccessMsg/SuccessMsg";

export default function AddBrand() {
  const dispatch = useDispatch();
  //form data
  const [formData, setFormData] = useState({
    name: "",
  });
  //onChange
  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  //onSubmit
  const handleOnSubmit = (e) => {
    e.preventDefault();
    dispatch(createBrandAction(formData?.name));
    //reset form
    setFormData({
      name: "",
    });
  };
  //get data from store
  const { error, loading, isAdded } = useSelector((state) => state?.brands);

  return (
    <>
      {isAdded && <SuccessMsg message="Brand Created Successfully" />}
      {error && <ErrorMsg message={error?.message} />}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <svg
            className="mx-auto h-10 text-blue-600 w-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
            />
          </svg>

          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-stone-900">
            Add Product Brand
          </h2>
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <form className="space-y-6" onSubmit={handleOnSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-stone-700">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    onChange={handleOnChange}
                    value={formData.name}
                    name="name"
                    className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                {loading ? (
                  <LoadingComponent />
                ) : (
                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Add Product Brand
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-stone-500">Or</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Link
                    to="/admin/add-brand"
                    className="inline-flex w-full justify-center rounded-md border border-stone-300 bg-white py-2 px-4 text-sm font-medium text-stone-500 shadow-sm hover:bg-stone-50">
                    Add Brand
                  </Link>
                </div>

                <div>
                  <div>
                    <Link
                      to="/admin/add-color"
                      className="inline-flex w-full justify-center rounded-md border border-stone-300 bg-white py-2 px-4 text-sm font-medium text-stone-500 shadow-sm hover:bg-stone-50">
                      Add Color
                    </Link>
                  </div>
                </div>

                <div>
                  <div>
                    <Link
                      to="/admin/add-category"
                      className="inline-flex w-full justify-center rounded-md border border-stone-300 bg-white py-2 px-4 text-sm font-medium text-stone-500 shadow-sm hover:bg-stone-50">
                      Add Category
                    </Link>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </>
  );
}
