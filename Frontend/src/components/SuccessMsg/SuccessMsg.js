import { useEffect } from "react";
import Swal from "sweetalert2";

const SuccessMsg = ({ message, show = true }) => {
  useEffect(() => {
    if (!show || !message) return;
    Swal.fire({
      icon: "success",
      title: "Good job!",
      text: message,
    });
  }, [message, show]);

  return null;
};

export default SuccessMsg;
