import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  fetchColorsAction,
  updateColorAction,
  deleteColorAction,
} from "../../../redux/slices/categories/colorsSlice";
import ErrorMsg from "../../ErrorMsg/ErrorMsg";
import LoadingComponent from "../../LoadingComp/LoadingComponent";
import NoDataFound from "../../NoDataFound/NoDataFound";

export default function ColorsList() {
  const dispatch = useDispatch();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editHex, setEditHex] = useState("");

  useEffect(() => {
    dispatch(fetchColorsAction());
  }, [dispatch]);

  const {
    colors: { colors },
    loading,
    error,
  } = useSelector((state) => state?.colors);

  const handleEdit = (color) => {
    setEditingId(color._id);
    setEditName(color.name);
    setEditHex(color.hex || "");
  };

  const handleSave = async () => {
    await dispatch(
      updateColorAction({ id: editingId, name: editName, hex: editHex })
    ).unwrap();
    setEditingId(null);
    dispatch(fetchColorsAction());
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this color?")) return;
    await dispatch(deleteColorAction(id)).unwrap();
    dispatch(fetchColorsAction());
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-stone-900">
            All Colors [{colors?.length}]
          </h1>
          <p className="mt-2 text-sm text-stone-700">
            A list of all the colors in your store.
          </p>
        </div>
        <div className="sm:ml-16 sm:flex-none">
          <Link
            to="/admin/add-color"
            type="button"
            className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto">
            Add New Color
          </Link>
        </div>
      </div>
      {loading ? (
        <LoadingComponent />
      ) : error ? (
        <ErrorMsg message={error?.message} />
      ) : colors?.length <= 0 ? (
        <NoDataFound />
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-stone-300">
                  <thead className="bg-stone-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-stone-900 sm:pl-6">
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Hex
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Created At
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {colors?.map((color) => (
                      <tr key={color?._id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          {editingId === color._id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="rounded border border-stone-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                            />
                          ) : (
                            <div className="flex items-center">
                              <span
                                className="inline-block h-4 w-4 rounded-full mr-2 border border-stone-300"
                                style={{ backgroundColor: color?.hex || "#ccc" }}
                              />
                              <span className="font-medium text-stone-900">
                                {color?.name}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {editingId === color._id ? (
                            <input
                              type="color"
                              value={editHex || "#000000"}
                              onChange={(e) => setEditHex(e.target.value)}
                              className="h-8 w-10 cursor-pointer rounded border border-stone-300"
                            />
                          ) : (
                            <span className="font-mono text-xs">{color?.hex || "—"}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500">
                          {new Date(color?.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {editingId === color._id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSave}
                                className="inline-flex items-center rounded bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center rounded bg-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-300">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleEdit(color)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.5"
                                  stroke="currentColor"
                                  className="w-5 h-5">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(color._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.5"
                                  stroke="currentColor"
                                  className="w-5 h-5">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
