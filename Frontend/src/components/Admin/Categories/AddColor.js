import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createColorAction,
  fetchColorsAction,
  updateColorAction,
  deleteColorAction,
} from "../../../redux/slices/categories/colorsSlice";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import SuccessMsg from "../../SuccessMsg/SuccessMsg";

export default function AddColor() {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ name: "", hex: "#000000" });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", hex: "#000000" });

  useEffect(() => {
    dispatch(fetchColorsAction());
  }, [dispatch]);

  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOnSubmit = (e) => {
    e.preventDefault();
    dispatch(createColorAction({ name: formData?.name, hex: formData?.hex })).then(() => {
      dispatch(fetchColorsAction());
    });
    setFormData({ name: "", hex: "#000000" });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this color?")) {
      dispatch(deleteColorAction(id)).then(() => {
        dispatch(fetchColorsAction());
      });
    }
  };

  const handleEditSave = (id) => {
    dispatch(updateColorAction({ id, name: editData.name, hex: editData.hex })).then(() => {
      setEditingId(null);
      dispatch(fetchColorsAction());
    });
  };

  const { error, loading, isAdded, isUpdated, isDelete, colors: colorsData } = useSelector(
    (state) => state?.colors
  );
  const allColors = colorsData?.colors || [];

  return (
    <>
      {isAdded && <SuccessMsg message="Color Created Successfully" />}
      {isUpdated && <SuccessMsg message="Color Updated Successfully" />}
      {isDelete && <SuccessMsg message="Color Deleted Successfully" />}
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
            Add Product Color
          </h2>
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <form className="space-y-6" onSubmit={handleOnSubmit}>
              <div>
                <label className="block text-sm font-medium text-stone-700">
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
                <label className="block text-sm font-medium text-stone-700">
                  Hex Color
                </label>
                <div className="mt-1 flex items-center space-x-3">
                  <input
                    type="color"
                    onChange={handleOnChange}
                    value={formData.hex}
                    name="hex"
                    className="h-10 w-14 cursor-pointer rounded border border-stone-300 p-0"
                  />
                  <input
                    onChange={handleOnChange}
                    value={formData.hex}
                    name="hex"
                    placeholder="#000000"
                    className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                  <span
                    className="inline-block h-8 w-8 rounded-full border border-stone-300"
                    style={{ backgroundColor: formData.hex }}
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
                    Add Product Color
                  </button>
                )}
              </div>
            </form>
        </div>

        {/* Existing Colors List */}
        <div className="mx-auto mt-10 w-full max-w-2xl">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">
            Existing Colors ({allColors.length})
          </h3>
          {allColors.length === 0 ? (
                  <p className="text-sm text-stone-500">No colors added yet.</p>
          ) : (
            <div className="space-y-2">
              {allColors.map((color) => (
                <div
                  key={color._id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm"
                >
                  {editingId === color._id ? (
                    /* Inline edit row */
                    <div className="flex flex-1 items-center gap-3">
                      <input
                        type="color"
                        value={editData.hex}
                        onChange={(e) => setEditData({ ...editData, hex: e.target.value })}
                        className="h-8 w-10 cursor-pointer rounded border border-stone-300 p-0"
                      />
                      <input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="rounded-md border border-stone-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <input
                        value={editData.hex}
                        onChange={(e) => setEditData({ ...editData, hex: e.target.value })}
                        className="w-24 rounded-md border border-stone-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleEditSave(color._id)}
                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-md bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    /* Display row */
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-7 w-7 rounded-full border border-stone-300"
                          style={{ backgroundColor: color.hex || color.name }}
                        />
                        <span className="text-sm font-medium text-stone-900 capitalize">
                          {color.name}
                        </span>
                        <span className="text-xs text-stone-400">{color.hex}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(color._id);
                            setEditData({ name: color.name, hex: color.hex || "#000000" });
                          }}
                          className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(color._id)}
                          className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
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
  );
}
