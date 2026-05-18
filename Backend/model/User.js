import mongoose from "mongoose";
import crypto from "crypto";
const Schema = mongoose.Schema;

const UserShema = new Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    phone: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: "",
    },
    hasShippingAddress: {
      type: Boolean,
      default: false,
    },
    shippingAddresses: [
      {
        firstName: { type: String },
        lastName: { type: String },
        address: { type: String },
        city: { type: String },
        postalCode: { type: String },
        province: { type: String },
        country: { type: String },
        phone: { type: String },
      },
    ],
    passwordResetOTP: { type: String },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserShema.methods.createPasswordResetOTP = function () {
  const otp = String(crypto.randomInt(100000, 999999));
  this.passwordResetOTP = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

//compile the schema to model
const User = mongoose.model("User", UserShema);

export default User;
