import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchAllUsersAction,
  toggleBlockUserAction,
} from '../../../redux/slices/users/usersSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'
import NoDataFound from '../../NoDataFound/NoDataFound'

export default function Customers() {
  const dispatch = useDispatch()
  const {
    error,
    loading,
    users,
    usersPagination,
    usersLoadingMore,
  } = useSelector((state) => state?.users)

  useEffect(() => {
    dispatch(fetchAllUsersAction({ limit: 20 }))
  }, [dispatch])

  const handleToggleBlock = (userId) => {
    dispatch(toggleBlockUserAction(userId)).then(() => {
      dispatch(fetchAllUsersAction({ limit: 20 }))
    })
  }

  const handleLoadMore = () => {
    if (!usersPagination?.hasMore || !usersPagination?.nextCursor || usersLoadingMore) {
      return
    }
    dispatch(
      fetchAllUsersAction({
        limit: usersPagination.limit || 20,
        cursor: usersPagination.nextCursor,
        append: true,
      })
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center"></div>

      <h3 className="text-lg font-medium leading-6 text-stone-900 mt-3">
        All Customers [{usersPagination?.total ?? users?.length ?? 0}]
      </h3>
      <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <LoadingComponent />
        ) : error ? (
          <ErrorMsg message={error?.message} />
        ) : users?.length <= 0 ? (
          <NoDataFound />
        ) : (
          <>
            <table className="min-w-full divide-y divide-stone-300">
              <thead className="bg-stone-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-stone-900 sm:pl-6"
                  >
                    Full Name
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-stone-900 lg:table-cell"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-stone-900 sm:table-cell"
                  >
                    Country
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900"
                  >
                    Phone
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-stone-900"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {users?.map((user) => (
                  <tr key={user._id}>
                    <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-stone-900 sm:w-auto sm:max-w-none sm:pl-6">
                      {user.fullname}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-stone-500 lg:table-cell">
                      {user.email}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-stone-500 sm:table-cell">
                      {user.country}
                    </td>
                    <td className="px-3 py-4 text-sm text-stone-500">
                      {user.phone}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          user.isBlocked
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        onClick={() => handleToggleBlock(user._id)}
                        disabled={user.isAdmin}
                        className={`inline-flex rounded-md px-3 py-1.5 text-xs font-medium ${
                          user.isAdmin
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : user.isBlocked
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {user.isAdmin
                          ? 'Block'
                          : user.isBlocked
                            ? 'Re-activate'
                            : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usersPagination?.hasMore && (
              <div className="border-t border-stone-200 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={usersLoadingMore}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {usersLoadingMore
                    ? 'Loading…'
                    : `Load more (${users?.length || 0} of ${usersPagination.total})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
