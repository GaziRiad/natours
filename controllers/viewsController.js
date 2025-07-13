const Tour = require("../models/tourModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");

const getOverview = catchAsync(async (req, res, next) => {
  // 1) Get all tours from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using tour data from step 1

  res.status(200).render("overview", {
    title: "All Tours",
    tours,
  });
});

const getTour = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  const tour = await Tour.findOne({ slug }).populate({
    path: "reviews",
    fields: "review rating user",
  });

  if (!tour) return next(new AppError("There is no tour with that name", 404));

  res.status(200).render("tour", {
    title: `${tour.name} tour`,
    tour,
  });
});

const getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "Login into your account",
  });
};

const getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your account",
  });
};

const getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the ruturned IDs
  const tourIDs = bookings.map((booking) => booking.tour);

  const tours = await Promise.all(
    tourIDs.map(async (el) => await Tour.findById(el)),
  );
  // const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render("overview", {
    title: "My Tours",
    tours,
  });
});

const updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    { new: true, runValidators: true },
  );

  res.status(200).render("account", {
    title: "Your account",
    user: updatedUser,
  });
});

module.exports = {
  getOverview,
  getTour,
  getLoginForm,
  getAccount,
  getMyTours,
  updateUserData,
};
