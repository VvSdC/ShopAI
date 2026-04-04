import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useLocation, Link } from "react-router-dom";
import { updateCategoryAction } from "../../../redux/slices/categories/categoriesSlice";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import SuccessMsg from "../../SuccessMsg/SuccessMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";

export default function UpdateCategory() {
  const { id } = useParams();
  const { state } = useLocation();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: state?.categoryName || "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(state?.categoryImage || "");

  const { loading, error, isUpdated } = useSelector(
    (state) => state?.categories
  );

  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleOnSubmit = (e) => {
    e.preventDefault();
    dispatch(
      updateCategoryAction({
        name: formData.name,
        file,
        id,
      })
    );
  };

  return (
    <>
      {error && <ErrorMsg message={error?.message} />}
      {isUpdated && <SuccessMsg message="Category updated successfully" />}
      <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Update Product Category
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleOnSubmit}>
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    onChange={handleOnChange}
                    value={formData.name}
                    name="name"
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Current / new image preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category Image
                </label>
                {preview && (
                  <div className="mt-2">
                    <img
                      src={preview}
                      alt="Category preview"
                      className="h-32 w-32 rounded-lg object-cover border"
                    />
                  </div>
                )}
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Upload a new image to replace the current one (max 5 MB).
                  </p>
                </div>
              </div>

              <div>
                {loading ? (
                  <LoadingComponent />
                ) : (
                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Update Category
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div>
                  <Link
                    to="/admin/add-brand"
                    className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50">
                    Add Brand
                  </Link>
                </div>

                <div>
                  <Link
                    to="/admin/add-color"
                    className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50">
                    Add Color
                  </Link>
                </div>

                <div>
                  <Link
                    to="/admin/add-category"
                    className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50">
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
