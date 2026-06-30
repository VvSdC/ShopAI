import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  createCategoryAction,
  fetchCategoriesAction,
  deleteCategoryAction,
} from '../../../redux/slices/categories/categoriesSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import SuccessMsg from '../../SuccessMsg/SuccessMsg'

export default function AddCategory() {
  const dispatch = useDispatch()
  const [formData, setFormData] = useState({ name: '' })
  const [file, setFile] = useState(null)
  const [fileErr, setFileErr] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    dispatch(fetchCategoriesAction())
  }, [dispatch])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const fileHandleChange = (event) => {
    const newFile = event.target.files?.[0]
    setFileErr(null)

    if (!newFile) {
      setFile(null)
      return
    }

    if (newFile.size > 1000000) {
      setFileErr(`${newFile.name} is too large (max 1MB)`)
      setFile(null)
      return
    }

    if (!newFile.type?.startsWith('image/')) {
      setFileErr(`${newFile.name} is not an image`)
      setFile(null)
      return
    }

    setFile(newFile)
  }

  const handleOnSubmit = (e) => {
    e.preventDefault()
    if (!String(formData.name || '').trim()) {
      setFileErr('Please enter a category name')
      return
    }
    if (!file) {
      setFileErr('Please upload a category image')
      return
    }

    setFileErr(null)
    dispatch(createCategoryAction({ name: formData.name.trim(), file })).then((result) => {
      if (createCategoryAction.fulfilled.match(result)) {
        setFormData({ name: '' })
        setFile(null)
        dispatch(fetchCategoriesAction())
      }
    })
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      dispatch(deleteCategoryAction(id)).then(() => {
        dispatch(fetchCategoriesAction())
      })
    }
  }

  const {
    error,
    loading,
    isAdded,
    isDelete,
    categories: categoriesData,
  } = useSelector((state) => state?.categories)
  const allCategories = categoriesData?.categories || []

  return (
    <>
      {isAdded && <SuccessMsg message="Category created successfully" />}
      {isDelete && <SuccessMsg message="Category deleted successfully" />}
      {error && <ErrorMsg message={error?.message} />}
      {fileErr && <ErrorMsg message={fileErr} />}

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <svg
            className="mx-auto h-10 w-auto text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
            />
          </svg>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-stone-900">
            Add Product Category
          </h2>
          <p className="mt-2 text-center text-sm text-stone-500">
            Create a category with a name and thumbnail image for your catalog.
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <form className="space-y-6" onSubmit={handleOnSubmit}>
            <div>
              <label htmlFor="category-name" className="block text-sm font-medium text-stone-700">
                Name
              </label>
              <div className="mt-1">
                <input
                  id="category-name"
                  onChange={handleOnChange}
                  value={formData.name}
                  name="name"
                  placeholder="e.g. Electronics, Clothing"
                  className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="category-image" className="block text-sm font-medium text-stone-700">
                Category image
              </label>
              <div className="mt-1">
                <div className="flex justify-center rounded-lg border-2 border-dashed border-stone-300 px-6 py-8 transition-colors hover:border-stone-400">
                  <div className="space-y-3 text-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Category preview"
                        className="mx-auto h-24 w-24 rounded-full border border-stone-200 object-cover"
                      />
                    ) : (
                      <svg
                        className="mx-auto h-12 w-12 text-stone-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    <div className="text-sm text-stone-600">
                      <label
                        htmlFor="category-image"
                        className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
                      >
                        <span>{previewUrl ? 'Change image' : 'Upload image'}</span>
                        <input
                          id="category-image"
                          type="file"
                          accept="image/*"
                          onChange={fileHandleChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-stone-500">PNG, JPG, or GIF up to 1MB</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {loading ? (
                <LoadingComponent />
              ) : (
                <button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Add Product Category
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mx-auto mt-10 w-full max-w-2xl">
          <h3 className="mb-4 text-lg font-semibold text-stone-900">
            Existing Categories ({allCategories.length})
          </h3>
          {allCategories.length === 0 ? (
            <p className="text-sm text-stone-500">No categories added yet.</p>
          ) : (
            <div className="space-y-2">
              {allCategories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-10 w-10 shrink-0 rounded-full border border-stone-200 object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
                        {category.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize text-stone-900">
                        {category.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {category.productCount ?? 0} products
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      to={`/admin/edit-category/${category._id}`}
                      state={{
                        categoryName: category.name,
                        categoryImage: category.image,
                      }}
                      className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(category._id)}
                      className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
