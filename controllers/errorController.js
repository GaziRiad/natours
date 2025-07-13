/* eslint-disable */

const AppError = require("../utils/appError");

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode || 500).json({
      status: err.status || "error",
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // RENDERED WEBSITE
    res.status(err.statusCode).render("error", {
      title: "Somethin went wrong!",
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    // Operational, trusted error: send message to client
    if (err?.isOperational) {
      return res.status(err.statusCode || 500).json({
        status: err.status || "error",
        message: err.message,
      });
    }
    // Programming or other unknow error: don't leak error details
    else {
      //  1) LOG ERROR
      console.error("ERROR 🧨", err);

      //  2) Send generic message
      return res.status(500).json({
        status: "error",
        message: "Something went very wrong!",
      });
    }
  }
  // RENDERED WEBSITE
  // Operational, trusted error: send message to client
  if (err?.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Somethin went wrong!",
      msg: err.message,
    });
  }
  // Programming or other unknow error: don't leak error details
  //  1) LOG ERROR
  console.error("ERROR 🧨", err);

  //  2) Send generic message
  return res.status(err.statusCode).render("error", {
    title: "Somethin went wrong!",
    msg: "Please try again later!",
  });
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate field value: ${err.keyValue.name}, Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(", ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please login again!", 401);

const handleTokenExpiredError = () =>
  new AppError("Your token has expired. Please login again!", 401);

module.exports = (err, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = Object.create(err);

    // eslint-disable-next-line no-cond-assign
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleTokenExpiredError();
    sendErrorProd(error, req, res);
  }
};
