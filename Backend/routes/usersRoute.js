import express from "express";
import {
  registerUserCtrl,
  loginUserCtrl,
  getUserProfileCtrl,
  updateShippingAddresctrl,
  editShippingAddressCtrl,
  deleteShippingAddressCtrl,
  refreshTokenCtrl,
  logoutUserCtrl,
  getCurrentUserCtrl,
  toggleBlockUserCtrl,
  deleteAccountCtrl,
  getAllUsersCtrl,
} from "../controllers/usersCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import isAdmin from "../middlewares/isAdmin.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUserCtrl);
userRoutes.post("/login", loginUserCtrl);
userRoutes.post("/refresh", refreshTokenCtrl);
userRoutes.post("/logout", logoutUserCtrl);
userRoutes.get("/me", isLoggedIn, getCurrentUserCtrl);
userRoutes.get("/profile", isLoggedIn, getUserProfileCtrl);
userRoutes.get("/all", isLoggedIn, isAdmin, getAllUsersCtrl);
userRoutes.put("/update/shipping", isLoggedIn, updateShippingAddresctrl);
userRoutes.put("/update/shipping/:addressId", isLoggedIn, editShippingAddressCtrl);
userRoutes.delete("/update/shipping/:addressId", isLoggedIn, deleteShippingAddressCtrl);
userRoutes.put("/block/:id", isLoggedIn, isAdmin, toggleBlockUserCtrl);
userRoutes.delete("/delete-account", isLoggedIn, deleteAccountCtrl);
export default userRoutes;
