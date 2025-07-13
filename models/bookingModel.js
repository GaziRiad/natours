const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: [true, "booking must have a Price!"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "booking must belong to a User!"],
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: [true, "booking must belong to a Your!"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookingSchema.index({ tour: 1, user: 1 });

bookingSchema.pre(/^find/, function (next) {
  this.populate("user").populate({ path: "tour", select: "name" });
  next();
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
