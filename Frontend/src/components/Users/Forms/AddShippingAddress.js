import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  getUserProfileAction,
  updateUserShippingAddressAction,
  editShippingAddressAction,
  deleteShippingAddressAction,
} from '../../../redux/slices/users/usersSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'

const emptyForm = {
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  country: '',
  province: '',
  postalCode: '',
  phone: '',
}

const AddShippingAddress = ({ onAddressSelect }) => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(getUserProfileAction())
  }, [dispatch])

  const { loading, error, profile } = useSelector((state) => state?.users)
  const user = profile?.user
  const addresses = useMemo(
    () => user?.shippingAddresses || [],
    [user?.shippingAddresses]
  )

  // Which address is selected for the order
  const [selectedId, setSelectedId] = useState(null)
  // Which address is being edited (its _id), or 'new' for adding
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  // Auto-select first address
  useEffect(() => {
    if (addresses.length > 0 && !selectedId) {
      setSelectedId(addresses[0]._id)
    }
  }, [addresses, selectedId])

  // Notify parent of selected address
  useEffect(() => {
    if (onAddressSelect && selectedId) {
      const addr = addresses.find((a) => a._id === selectedId)
      if (addr) onAddressSelect(addr)
    }
  }, [selectedId, addresses, onAddressSelect])

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const startAdd = () => {
    setEditingId('new')
    setFormData({ ...emptyForm, country: 'IN' })
  }

  const startEdit = (addr) => {
    setEditingId(addr._id)
    setFormData({
      firstName: addr.firstName || '',
      lastName: addr.lastName || '',
      address: addr.address || '',
      city: addr.city || '',
      country: addr.country || '',
      province: addr.province || '',
      postalCode: addr.postalCode || '',
      phone: addr.phone || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData(emptyForm)
  }

  const onSubmit = (e) => {
    e.preventDefault()

    const payload = {
      ...formData,
      country: formData.country || 'IN',
    }

    const required = [
      ['firstName', 'First name'],
      ['lastName', 'Last name'],
      ['address', 'Address'],
      ['city', 'City'],
      ['province', 'State / Province'],
      ['postalCode', 'Postal code'],
      ['phone', 'Phone'],
    ]
    const missing = required.filter(([key]) => !String(payload[key] || '').trim())
    if (missing.length) {
      window.alert(`Please fill in: ${missing.map(([, label]) => label).join(', ')}`)
      return
    }

    if (editingId === 'new') {
      dispatch(updateUserShippingAddressAction(payload)).then((result) => {
        if (updateUserShippingAddressAction.rejected.match(result)) return
        setEditingId(null)
        setFormData(emptyForm)
        dispatch(getUserProfileAction())
      })
    } else {
      dispatch(
        editShippingAddressAction({ addressId: editingId, ...payload })
      ).then((result) => {
        if (editShippingAddressAction.rejected.match(result)) return
        setEditingId(null)
        setFormData(emptyForm)
        dispatch(getUserProfileAction())
      })
    }
  }

  const handleDelete = (addressId) => {
    if (window.confirm('Delete this address?')) {
      dispatch(deleteShippingAddressAction(addressId)).then(() => {
        if (selectedId === addressId) setSelectedId(null)
        dispatch(getUserProfileAction())
      })
    }
  }

  const renderForm = () => (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          First name
        </label>
        <input
          type="text"
          name="firstName"
          onChange={onChange}
          value={formData.firstName}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Last name
        </label>
        <input
          type="text"
          name="lastName"
          onChange={onChange}
          value={formData.lastName}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <input
          type="text"
          name="address"
          onChange={onChange}
          value={formData.address}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          name="city"
          onChange={onChange}
          value={formData.city}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Country
        </label>
        <select
          name="country"
          value={formData.country}
          onChange={onChange}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">-- Select Country --</option>
          <option value="IN">India</option>
          <option value="CA">Canada</option>
          <option value="MX">Mexico</option>
          <option value="GH">Ghana</option>
          <option value="NG">Nigeria</option>
          <option value="ZA">South Africa</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          State / Province
        </label>
        <input
          type="text"
          name="province"
          onChange={onChange}
          value={formData.province}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Postal code
        </label>
        <input
          type="text"
          name="postalCode"
          onChange={onChange}
          value={formData.postalCode}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          type="text"
          name="phone"
          onChange={onChange}
          value={formData.phone}
          className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="sm:col-span-2 flex space-x-3">
        {loading ? (
          <LoadingComponent />
        ) : (
          <>
            <button
              type="submit"
              className="flex-1 rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              {editingId === 'new' ? 'Add Address' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex-1 rounded-md bg-gray-200 py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </form>
  )

  return (
    <>
      {error && <ErrorMsg message={error?.message} />}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Shipping Addresses
          </h3>
          {editingId === null && (
            <button
              onClick={startAdd}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              + Add New Address
            </button>
          )}
        </div>

        {/* Address list */}
        {addresses.length === 0 && editingId === null && (
          <p className="text-gray-500 text-sm mb-4">
            No addresses yet. Add one to proceed.
          </p>
        )}

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              onClick={() => {
                if (editingId === null) setSelectedId(addr._id)
              }}
              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                selectedId === addr._id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {selectedId === addr._id && (
                <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                  Selected
                </span>
              )}
              <p className="font-medium text-gray-900">
                {addr.firstName} {addr.lastName}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {addr.address}, {addr.city}, {addr.province} {addr.postalCode}
              </p>
              <p className="text-sm text-gray-500">
                {addr.country} &middot; {addr.phone}
              </p>
              <div className="mt-2 flex space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(addr)
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(addr._id)
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit form */}
        {editingId !== null && renderForm()}
      </div>
    </>
  )
}

export default AddShippingAddress
