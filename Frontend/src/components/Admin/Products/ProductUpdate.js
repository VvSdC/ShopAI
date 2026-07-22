import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { fetchBrandsAction } from "../../../redux/slices/categories/brandsSlice";
import { fetchCategoriesAction } from "../../../redux/slices/categories/categoriesSlice";
import { fetchColorsAction } from "../../../redux/slices/categories/colorsSlice";
import { fetchProductAction, updateProductAction } from "../../../redux/slices/products/productSlices";
import ProductSizeFields from "./ProductSizeFields";
import ProductDescriptionField from "./ProductDescriptionField";
import { buildSizePayload } from "../../../utils/sizeMeasurement";
import { resetSuccessAction } from "../../../redux/slices/globalActions/globalActions";

import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import SuccessMsg from "../../SuccessMsg/SuccessMsg";

//animated components for react-select
const animatedComponents = makeAnimated();

export default function ProductUpdate() {
  //dispatch
  const dispatch = useDispatch();
  const navigate = useNavigate();
  //get id from params
  const { id } = useParams();
  // Reset stale success flag when opening a product for edit
  useEffect(() => {
    dispatch(resetSuccessAction());
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(fetchProductAction(id));
  }, [id, dispatch]);

  //Size fields
  const [sizeFields, setSizeFields] = useState({
    sizeMeasurementType: "apparel",
    sizeLabel: "Size",
    sizes: [],
  });

  //categories
  useEffect(() => {
    dispatch(fetchCategoriesAction());
  }, [dispatch]);
  //select data from store
  const { categories } = useSelector((state) => state?.categories?.categories);

  //brands
  useEffect(() => {
    dispatch(fetchBrandsAction());
  }, [dispatch]);
  //select data from store
  const {
    brands: { brands },
  } = useSelector((state) => state?.brands);
  //colors
  const [colorsOption, setColorsOption] = useState([]);

  const {
    colors: { colors },
  } = useSelector((state) => state?.colors);
  useEffect(() => {
    dispatch(fetchColorsAction());
  }, [dispatch]);

  const handleColorChange = (colors) => {
    setColorsOption(colors);
  };
  //converted colors
  const colorsCoverted = colors?.map((color) => {
    return {
      value: color?.name,
      label: color?.name,
    };
  });

  //get product from store
  const { product, isUpdated, loading, error } = useSelector(
    (state) => state?.products
  );

  //---form data---
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    sizes: [],
    brand: "",
    colors: [],
    price: "",
    totalQty: "",
  });

  // When product is loaded, populate form and select values
  useEffect(() => {
    if (product) {
      // `product` in slice is the product object (not nested)
      setFormData({
        name: product?.name || "",
        description: product?.description || "",
        category: product?.category || "",
        sizes: product?.sizes || [],
        brand: product?.brand || "",
        colors: product?.colors || [],
        price: product?.price || "",
        totalQty: product?.totalQty || "",
      })

      setSizeFields({
        sizeMeasurementType: product?.sizeMeasurementType || "apparel",
        sizeLabel: product?.sizeLabel || "Size",
        sizes: product?.sizes || [],
      });
      // initialize color select values
      const initialColors = (product?.colors || []).map((c) => ({
        value: c,
        label: c,
      }))
      setColorsOption(initialColors)
    }
  }, [product])

  //onChange
  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  //onSubmit
  const handleOnSubmit = (e) => {
    e.preventDefault();
    //dispatch
    dispatch(
      updateProductAction({
        ...formData,
        ...buildSizePayload(sizeFields),
        id,
        colors: colorsOption?.map((color) => color.label),
      })
    ).unwrap().then(() => {
      dispatch(resetSuccessAction());
      navigate('/admin/manage-products');
    }).catch(() => {});
  };

  return (
    <>
      {error && <ErrorMsg message={error?.message} />}
      {isUpdated && <SuccessMsg message="Product Updated Successfully" />}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-stone-900">
            Update Product
          </h2>
          <p className="mt-2 text-center text-sm text-stone-600">
            <p className="font-medium text-indigo-600 hover:text-indigo-500">
              Manage Products
            </p>
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <form className="space-y-6" onSubmit={handleOnSubmit}>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Product Name
                </label>
                <div className="mt-1">
                  <input
                    name="name"
                    value={formData?.name}
                    onChange={handleOnChange}
                    className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <ProductSizeFields value={sizeFields} onChange={setSizeFields} />
              {/* Select category */}
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Select Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleOnChange}
                  className="mt-1  block w-full rounded-md border-stone-300 py-2  pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                  defaultValue="Canada">
                  <option>-- Select Category --</option>
                  {categories?.map((category) => (
                    <option key={category?._id} value={category?.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Select Brand */}
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Select Brand
                </label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleOnChange}
                  className="mt-1  block w-full rounded-md border-stone-300 py-2  pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                  defaultValue="Canada">
                  <option>-- Select Brand --</option>
                  {brands?.map((brand) => (
                    <option key={brand?._id} value={brand?.name}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Color */}
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Select Color
                </label>
                <Select
                  components={animatedComponents}
                  isMulti
                  name="colors"
                  options={colorsCoverted}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  isClearable={true}
                  isLoading={false}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  onChange={(e) => handleColorChange(e)}
                  value={colorsOption}
                />
              </div>

              {/* price */}
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Price
                </label>
                <div className="mt-1">
                  <input
                    name="price"
                    value={formData.price}
                    onChange={handleOnChange}
                    type="number"
                    className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Total Quantity
                </label>
                <div className="mt-1">
                  <input
                    name="totalQty"
                    value={formData.totalQty}
                    onChange={handleOnChange}
                    type="number"
                    className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <ProductDescriptionField
                name="description"
                value={formData.description}
                onChange={handleOnChange}
              />
              <div>
                {loading ? (
                  <LoadingComponent />
                ) : (
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    Update Product
                  </button>
                )}
              </div>
            </form>
        </div>
      </div>
    </>
  );
}
