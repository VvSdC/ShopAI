import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";

import { resetErrAction } from "../../redux/slices/globalActions/globalActions";

const ErrorMsg = ({ message }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: message,
    });
    dispatch(resetErrAction());
  }, [message, dispatch]);
  return null;
};

export default ErrorMsg;
