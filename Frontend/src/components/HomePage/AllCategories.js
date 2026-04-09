import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchCategoriesAction } from "../../redux/slices/categories/categoriesSlice";

const AllCategories = () => {
  //dispatch
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchCategoriesAction());
  }, [dispatch]);

  //get data from store
  const {
    categories: { categories },
  } = useSelector((state) => state?.categories);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            All Categories
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Browse our {categories?.length} categories and find the best
            products for you.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories?.map((category) => (
            <Link
              key={category?._id}
              to={`/products-filters?category=${category?.name}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative h-56 w-full overflow-hidden">
                <img
                  src={category.image}
                  alt={category?.name}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Product count badge */}
                <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm">
                  {category.products?.length}{" "}
                  {category.products?.length === 1 ? "Product" : "Products"}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <h3
                  className="text-lg font-semibold text-gray-900 capitalize group-hover:text-indigo-600 transition-colors duration-200"
                >
                  {category.name}
                </h3>
                <p className="mt-2 flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                  Shop now
                  <svg
                    className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllCategories;
