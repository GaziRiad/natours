const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return token;
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // send only over HTTPS in production
    sameSite: "Strict", // prevent CSRF
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined; //just to hide password from response

  res.status(statusCode).json({
    status: "success",
    data: { user },
    token,
  });
};

const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password)
    return next(new AppError("Please provide email and password!", 400));

  // 2) Check if user exists & password is correct
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError("Incorrect email or password", 401)); //401 means unauthroized

  // 3) Send token
  createSendToken(user, 200, res);
});

const logout = catchAsync(async (req, res, next) => {
  res.cookie("jwt", "", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
  });
});

const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1) Get token from headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // eslint-disable-next-line prefer-destructuring
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError("You are not logged in! Please login to get access.", 401),
    );

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError("User no longer exists", 401));

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError("Password was changed recently. Please log in again.", 401),
    );

  // 5) Grant access to PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser; //Only necessary for pug rendered templates

  next();
});

// This if for PUG rendered pages only! no errors!
const isLoggedIn = catchAsync(async (req, res, next) => {
  // 1) Get token from headers

  // eslint-disable-next-line prefer-destructuring
  if (req.cookies.jwt) {
    // 1) Verify token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return next();

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) return next();

    // THERE is a longedIn USER
    res.locals.user = currentUser;
    return next();
  }
  next();
});

// eslint-disable-next-line arrow-body-style
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You do not have permission to perform this action", 403), // 403 means forbidden
      );

    next();
  };
};

const forgotPassword = catchAsync(async (req, res, next) => {
  //   1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError("There is no user with that email address.", 404));

  //   2) Generate the random token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //   3) Sned it to user's email
  try {
    const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();
  } catch (err) {
    //In case of error reset everything
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500,
      ),
    );
  }

  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user base on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() },
  });

  // 2) If token has not expired, and there is a user, set a new password
  if (!user) return next(new AppError("Token is invalid or has expired.", 400));
  if (!req.body.password || !req.body.passwordConfirm)
    return next(
      new AppError("Please provide new password and passwordConfirm.", 400),
    );

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  if (
    !req.body.newPassword ||
    !req.body.currentPassword ||
    !req.body.passwordConfirm
  )
    return next(
      new AppError("Please provide the current and new passwords!", 404),
    );

  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password)))
    return next("Current password is not correct.", 401);

  // 3) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

module.exports = {
  signup,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  isLoggedIn,
  logout,
};
