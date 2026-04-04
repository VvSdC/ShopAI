import React from "react";
import { useSelector } from "react-redux";
import Login from "../Users/Forms/Login";

const AuthRoute = ({ children }) => {
  //get user from redux store
  const { userAuth } = useSelector((state) => state?.users);
  const isLoggedIn = userAuth?.isLoggedIn;
  if (!isLoggedIn) return <Login />;
  return <>{children}</>;
};

export default AuthRoute;
