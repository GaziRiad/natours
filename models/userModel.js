const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { isEmail } = require("validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email."],
    unique: true,
    lowercase: true,
    validate: {
      validator(val) {
        return isEmail(val);
      },
      message: "Please provide a valid email.",
    },
  },
  photo: { type: String, default: "default.jpg" },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password."],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please provide a passwordConfirm field."],
    validate: {
      // This only works on .save() and .create()
      validator(val) {
        return this.password === val;
      },
      message: "Passwords are not the same!",
    },
  },
  passwordChangedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  // Only run if password was actually modified
  if (!this.isModified("password")) return next();

  // hashing
  this.password = await bcrypt.hash(this.password, 12);

  // Remove confirm field
  this.passwordConfirm = undefined;
  next();
});

// THis is important To ensure any token issued before a password change becomes invalid.
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  // Set timestamp slightly in the past to avoid issues with token creation time
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // Exclude inactive users from query results
  this.find({ active: { $ne: false } });
  next();
});

// Instance method to compare passwords
userSchema.methods.correctPassword = async function (candidate, actual) {
  return await bcrypt.compare(candidate, actual);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    return parseInt(this.passwordChangedAt.getTime() / 1000, 10) > JWTTimestamp;
  }
  return false; // by default user hasn't change his password
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Encrypted version saved in DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins

  return resetToken; // Send plain token via email
};

const User = mongoose.model("User", userSchema);
module.exports = User;
