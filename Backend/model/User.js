import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
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
    sessions: [
      {
        /** SHA-256 hex digest of the refresh JWT — never store the raw token. */
        token: { type: String, required: true },
        deviceId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
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
    /** Bcrypt hash of the 6-digit password-reset OTP — never store plaintext or SHA-256. */
    passwordResetOTP: { type: String },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserShema.methods.createPasswordResetOTP = async function () {
  const otp = String(crypto.randomInt(100000, 999999));
  this.passwordResetOTP = await bcrypt.hash(otp, 10);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

UserShema.methods.verifyPasswordResetOTP = async function (otp) {
  if (!this.passwordResetOTP) return false;

  const expires = this.passwordResetExpires;
  const expiresMs = expires instanceof Date ? expires.getTime() : Number(expires);
  if (!expiresMs || expiresMs <= Date.now()) return false;

  return bcrypt.compare(String(otp), this.passwordResetOTP);
};

UserShema.statics.findByEmailAndValidResetOtp = async function (email, otp) {
  const user = await this.findOne({
    email: String(email || "").toLowerCase().trim(),
    passwordResetOTP: { $exists: true, $ne: null },
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) return null;

  const valid = await user.verifyPasswordResetOTP(otp);
  return valid ? user : null;
};

UserShema.index({ "sessions.token": 1 });

//compile the schema to model
const User = mongoose.model("User", UserShema);

export default User;
