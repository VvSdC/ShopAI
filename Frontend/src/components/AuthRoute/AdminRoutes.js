import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUserAction } from "../../redux/slices/users/usersSlice";
import AdminOnly from "../NotAuthorised/AdminOnly";

const AdminRoutes = ({ children }) => {
  //dispatch
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getCurrentUserAction());
  }, [dispatch]);
  //get user from store
  const { userAuth } = useSelector((state) => state?.users);
  const isAdmin = userAuth?.userInfo?.isAdmin ? true : false;
  if (!isAdmin) return <AdminOnly />;
  return <>{children}</>;
};

export default AdminRoutes;
