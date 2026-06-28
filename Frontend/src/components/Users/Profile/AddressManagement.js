import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import {
  updateUserShippingAddressAction,
  editShippingAddressAction,
  deleteShippingAddressAction,
} from '../../../redux/slices/users/usersSlice'
import ConfirmDialog from '../../common/ConfirmDialog'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'

const emptyForm = {
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  country: 'IN',
  province: '',
  postalCode: '',
  phone: '',
}

const COUNTRY_LABELS = {
  IN: 'India',
  CA: 'Canada',
  MX: 'Mexico',
  GH: 'Ghana',
  NG: 'Nigeria',
  ZA: 'South Africa',
  US: 'United States',
  GB: 'United Kingdom',
}

const inputClass =
  'mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function countryLabel(code) {
  return COUNTRY_LABELS[code] || code || '—'
}

export default function AddressManagement({ onToast }) {
  const dispatch = useDispatch()
  const { loading, error, profile } = useSelector((state) => state?.users)
  const addresses = profile?.user?.shippingAddresses || []

  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

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
      country: addr.country || 'IN',
      province: addr.province || '',
      postalCode: addr.postalCode || '',
      phone: addr.phone || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData(emptyForm)
  }

  const validateForm = (payload) => {
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
      onToast?.(`Please fill in: ${missing.map(([, label]) => label).join(', ')}`)
      return false
    }
    return true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...formData, country: formData.country || 'IN' }
    if (!validateForm(payload)) return

    setSaving(true)
    try {
      if (editingId === 'new') {
        const result = await dispatch(updateUserShippingAddressAction(payload))
        if (updateUserShippingAddressAction.rejected.match(result)) return
        onToast?.('Address added successfully.')
      } else {
        const result = await dispatch(
          editShippingAddressAction({ addressId: editingId, ...payload })
        )
        if (editShippingAddressAction.rejected.match(result)) return
        onToast?.('Address updated successfully.')
      }
      setEditingId(null)
      setFormData(emptyForm)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await dispatch(deleteShippingAddressAction(deleteTarget))
      onToast?.('Address removed.')
      if (editingId === deleteTarget) cancelEdit()
    } finally {
      setSaving(false)
      setDeleteTarget(null)
    }
  }

  const renderForm = () => (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-lg border border-stone-200 bg-stone-50/50 p-4 sm:p-5"
    >
      <h4 className="text-sm font-semibold text-stone-900">
        {editingId === 'new' ? 'New address' : 'Edit address'}
      </h4>
      <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">First name</label>
          <input
            type="text"
            name="firstName"
            onChange={onChange}
            value={formData.firstName}
            className={inputClass}
            autoComplete="given-name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Last name</label>
          <input
            type="text"
            name="lastName"
            onChange={onChange}
            value={formData.lastName}
            className={inputClass}
            autoComplete="family-name"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-stone-700">Street address</label>
          <input
            type="text"
            name="address"
            onChange={onChange}
            value={formData.address}
            className={inputClass}
            autoComplete="street-address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">City</label>
          <input
            type="text"
            name="city"
            onChange={onChange}
            value={formData.city}
            className={inputClass}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">State / Province</label>
          <input
            type="text"
            name="province"
            onChange={onChange}
            value={formData.province}
            className={inputClass}
            autoComplete="address-level1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Postal code</label>
          <input
            type="text"
            name="postalCode"
            onChange={onChange}
            value={formData.postalCode}
            className={inputClass}
            autoComplete="postal-code"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Country</label>
          <select
            name="country"
            value={formData.country}
            onChange={onChange}
            className={inputClass}
            autoComplete="country"
          >
            <option value="">Select country</option>
            {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-stone-700">Phone</label>
          <input
            type="tel"
            name="phone"
            onChange={onChange}
            value={formData.phone}
            className={inputClass}
            autoComplete="tel"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex flex-1 items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 sm:flex-none sm:min-w-[8rem]"
          >
            {saving ? 'Saving…' : editingId === 'new' ? 'Add address' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 sm:flex-none sm:min-w-[8rem]"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )

  return (
    <>
      {error && <ErrorMsg message={error?.message} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          {addresses.length === 0
            ? 'Save addresses for faster checkout.'
            : `${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}`}
        </p>
        {editingId === null && (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add address
          </button>
        )}
      </div>

      {addresses.length === 0 && editingId === null && (
        <div className="mt-6 rounded-lg border-2 border-dashed border-stone-200 py-10 text-center">
          <MapPinIcon className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-2 text-sm font-medium text-stone-900">No saved addresses</p>
          <p className="mt-1 text-sm text-stone-500">
            Add a delivery address to use at checkout.
          </p>
          <button
            type="button"
            onClick={startAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add your first address
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {addresses.map((addr) => (
          <li
            key={addr._id}
            className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-stone-300"
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <MapPinIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">
                  {addr.firstName} {addr.lastName}
                </p>
                <p className="mt-1 text-sm text-stone-600">{addr.address}</p>
                <p className="text-sm text-stone-600">
                  {addr.city}, {addr.province} {addr.postalCode}
                </p>
                <p className="text-sm text-stone-500">
                  {countryLabel(addr.country)} · {addr.phone}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
              <button
                type="button"
                onClick={() => startEdit(addr)}
                disabled={editingId !== null}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(addr._id)}
                disabled={editingId !== null}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editingId !== null && renderForm()}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete address"
        message="Remove this address from your account? You can add it again anytime."
        confirmLabel="Delete"
        cancelLabel="Keep address"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
