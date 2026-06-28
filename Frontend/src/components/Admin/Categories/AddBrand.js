import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createBrandAction,
  fetchBrandsAction,
  updateBrandAction,
  deleteBrandAction,
} from '../../../redux/slices/categories/brandsSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import SuccessMsg from '../../SuccessMsg/SuccessMsg'

export default function AddBrand() {
  const dispatch = useDispatch()
  const [formData, setFormData] = useState({ name: '' })
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [formErr, setFormErr] = useState(null)

  useEffect(() => {
    dispatch(fetchBrandsAction())
  }, [dispatch])

  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (formErr) setFormErr(null)
  }

  const handleOnSubmit = (e) => {
    e.preventDefault()
    const name = String(formData.name || '').trim()
    if (!name) {
      setFormErr('Please enter a brand name')
      return
    }

    dispatch(createBrandAction(name)).then((result) => {
      if (createBrandAction.fulfilled.match(result)) {
        setFormData({ name: '' })
        setFormErr(null)
        dispatch(fetchBrandsAction())
      }
    })
  }

  const handleEditSave = (id) => {
    const name = String(editName || '').trim()
    if (!name) return

    dispatch(updateBrandAction({ id, name })).then((result) => {
      if (updateBrandAction.fulfilled.match(result)) {
        setEditingId(null)
        dispatch(fetchBrandsAction())
      }
    })
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      dispatch(deleteBrandAction(id)).then(() => {
        dispatch(fetchBrandsAction())
      })
    }
  }

  const {
    error,
    loading,
    isAdded,
    isUpdated,
    isDelete,
    brands: brandsData,
  } = useSelector((state) => state?.brands)
  const allBrands = brandsData?.brands || []

  return (
    <>
      {isAdded && <SuccessMsg message="Brand created successfully" />}
      {isUpdated && <SuccessMsg message="Brand updated successfully" />}
      {isDelete && <SuccessMsg message="Brand deleted successfully" />}
      {error && <ErrorMsg message={error?.message} />}
      {formErr && <ErrorMsg message={formErr} />}

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
            Add Product Brand
          </h2>
          <p className="mt-2 text-center text-sm text-stone-500">
            Add a brand name to use when creating and filtering products.
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <form className="space-y-6" onSubmit={handleOnSubmit}>
            <div>
              <label htmlFor="brand-name" className="block text-sm font-medium text-stone-700">
                Name
              </label>
              <div className="mt-1">
                <input
                  id="brand-name"
                  onChange={handleOnChange}
                  value={formData.name}
                  name="name"
                  placeholder="e.g. Nike, Samsung, Apple"
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
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Add Product Brand
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mx-auto mt-10 w-full max-w-2xl">
          <h3 className="mb-4 text-lg font-semibold text-stone-900">
            Existing Brands ({allBrands.length})
          </h3>
          {allBrands.length === 0 ? (
            <p className="text-sm text-stone-500">No brands added yet.</p>
          ) : (
            <div className="space-y-2">
              {allBrands.map((brand) => (
                <div
                  key={brand._id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm"
                >
                  {editingId === brand._id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleEditSave(brand._id)}
                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold uppercase text-indigo-700">
                          {brand.name?.charAt(0) || '?'}
                        </span>
                        <span className="truncate text-sm font-medium capitalize text-stone-900">
                          {brand.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(brand._id)
                            setEditName(brand.name)
                          }}
                          className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(brand._id)}
                          className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
