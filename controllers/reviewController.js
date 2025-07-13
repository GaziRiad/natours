const Review = require("../models/reviewModel");
const factory = require("../utils/handleFactory");

const setTourUserIds = (req, res, next) => {
  const { tourId } = req.params;
  req.body = { ...req.body, tour: tourId, user: req.user.id };
  next();
};

const getAllReviews = factory.getAll(Review);
const getReview = factory.getOne(Review);
const createReview = factory.createOne(Review);
const updateReview = factory.updateOne(Review);
const deleteReview = factory.deleteOne(Review);

module.exports = {
  getAllReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  setTourUserIds,
};
