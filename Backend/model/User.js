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
    /** Set after successful OTP verification; allows one password reset without reusing the OTP hash. */
    passwordResetVerifiedUntil: { type: Date },
    /** False only for new signups that have not confirmed their inbox yet. */
    isEmailVerified: { type: Boolean, default: true },
    /** Bcrypt hash of the 6-digit signup verification OTP. */
    emailVerificationOTP: { type: String },
    emailVerificationExpires: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password
        delete ret.sessions
        delete ret.passwordResetOTP
        delete ret.passwordResetExpires
        delete ret.passwordResetVerifiedUntil
        delete ret.emailVerificationOTP
        delete ret.emailVerificationExpires
        return ret
      },
    },
  }
);

UserShema.methods.createPasswordResetOTP = async function () {
  const otp = String(crypto.randomInt(100000, 999999));
  this.passwordResetOTP = await bcrypt.hash(otp, 10);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  this.passwordResetVerifiedUntil = undefined;
  return otp;
};

UserShema.methods.createEmailVerificationOTP = async function () {
  const otp = String(crypto.randomInt(100000, 999999));
  this.emailVerificationOTP = await bcrypt.hash(otp, 10);
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

UserShema.methods.verifyEmailVerificationOTP = async function (otp) {
  if (!this.emailVerificationOTP) return false;

  const expires = this.emailVerificationExpires;
  const expiresMs = expires instanceof Date ? expires.getTime() : Number(expires);
  if (!expiresMs || expiresMs <= Date.now()) return false;

  return bcrypt.compare(String(otp), this.emailVerificationOTP);
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

UserShema.statics.findByEmailAndValidVerificationOtp = async function (email, otp) {
  const user = await this.findOne({
    email: String(email || "").toLowerCase().trim(),
    isEmailVerified: false,
    emailVerificationOTP: { $exists: true, $ne: null },
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) return null;

  const valid = await user.verifyEmailVerificationOTP(otp);
  return valid ? user : null;
};

UserShema.statics.findByEmailAndVerifiedReset = async function (email) {
  return this.findOne({
    email: String(email || "").toLowerCase().trim(),
    passwordResetVerifiedUntil: { $gt: Date.now() },
  });
};

UserShema.index({ "sessions.token": 1 });

//compile the schema to model
const User = mongoose.model("User", UserShema);

/** Mongoose select string — omit secrets from API responses. */
export const SAFE_USER_SELECT =
  "-password -sessions -passwordResetOTP -passwordResetExpires -passwordResetVerifiedUntil -emailVerificationOTP -emailVerificationExpires";

export default User;
