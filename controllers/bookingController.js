const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/bookingModel");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("../utils/handleFactory");

const getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  if (!tour) return next(new AppError("", 400));

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    success_url: `${req.protocol}://${req.get("host")}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get("host")}/tours/${tour.slug}`,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({ status: "success", session });
});

const createBookingCheckout = catchAsync(async (req, res, next) => {
  // THIS is only TEMPORARY, bcs it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour || !user || !price) return next();

  await Booking.create({
    price,
    tour,
    user,
  });

  res.redirect(req.originalUrl.split("?")[0]);
});

const getAllBookings = factory.getAll(Booking);
const getBooking = factory.getOne(Booking);
const createBooking = factory.createOne(Booking);
const updateBooking = factory.updateOne(Booking);
const deleteBooking = factory.deleteOne(Booking);

module.exports = {
  getCheckoutSession,
  createBookingCheckout,
  getAllBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
};
