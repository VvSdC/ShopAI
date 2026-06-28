import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchProductsAction, deleteProductAction } from "../../../redux/slices/products/productSlices";
import baseURL from "../../../utils/baseURL";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import NoDataFound from "../../NoDataFound/NoDataFound";
import ShopPagination from "../../Users/Products/ShopPagination";

const PAGE_SIZE = 15;

export default function ManageStocks() {
  const [page, setPage] = useState(1);
  const productUrl = `${baseURL}/products?page=${page}&limit=${PAGE_SIZE}`;
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      fetchProductsAction({
        url: productUrl,
      })
    );
  }, [dispatch, productUrl]);

  const deleteProductHandler = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This product and all its reviews will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteProductAction(id))
          .unwrap()
          .then(() => {
            Swal.fire("Deleted!", "Product has been deleted.", "success");
            return dispatch(fetchProductsAction({ url: productUrl })).unwrap();
          })
          .then((data) => {
            if (!data?.products?.length && page > 1) {
              setPage((p) => p - 1);
            }
          })
          .catch((err) => {
            Swal.fire("Error", err?.message || "Failed to delete product", "error");
          });
      }
    });
  };
  //get data from store
  const {
    products: { products, total },
    loading,
    error,
  } = useSelector((state) => state?.products);
  const productCount = total ?? 0;
  const totalPages = Math.max(1, Math.ceil(productCount / PAGE_SIZE) || 1);
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-stone-900">
            Product List{" "}
            <span className="text-stone-500 font-normal">
              ({productCount} {productCount === 1 ? "product" : "products"})
            </span>
          </h1>
          <p className="mt-2 text-sm text-stone-700">
            List of all the products in your account including their name,
            title,
          </p>
        </div>
        <div className="sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto">
            Add New Product
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingComponent />
      ) : error ? (
        <ErrorMsg message={error?.message} />
      ) : products?.length <= 0 ? (
        <NoDataFound />
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
                <table className="min-w-full table-fixed divide-y divide-stone-300">
                  <thead className="bg-stone-50">
                    <tr>
                      <th
                        scope="col"
                        className="w-[min(280px,32%)] py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-stone-900 sm:pl-6">
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Total Qty
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Total Sold
                      </th>

                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        QTY Left
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Price
                      </th>
                      <th
                        scope="col"
                        className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {/* loop here */}
                    {products?.map((product) => (
                      <tr key={product._id}>
                        <td className="py-4 pl-4 pr-3 text-sm align-top sm:pl-6">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={product?.images[0]}
                                alt={product?.name}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-stone-900 break-words">
                                {product.name}
                              </div>
                              <div className="mt-0.5 text-stone-500 break-words">
                                {product?.brand}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          <div className="text-stone-900">
                            {product?.category}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {product?.qtyLeft < 0 ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {product?.totalQty}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {product?.totalSold}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {product?.qtyLeft}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {product?.price}
                        </td>
                        {/* edit */}
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            to={`/admin/products/edit/${product._id}`}
                            className="text-indigo-600 hover:text-indigo-900">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="w-6 h-6">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>

                            <span className="sr-only">, {product.name}</span>
                          </Link>
                        </td>
                        {/* delete */}
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => deleteProductHandler(product._id)}
                            className="text-red-600 hover:text-red-900">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-6 h-6">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>

                            <span className="sr-only">, {product.name}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <ShopPagination
            page={page}
            totalPages={totalPages}
            total={productCount}
            limit={PAGE_SIZE}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
