const multer = require("multer");
const sharp = require("sharp");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("../utils/handleFactory");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

// upload.single("image");
// upload.array("images", 5);

const resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333, { fit: "cover" })
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Other image
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, index) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpg`;

      await sharp(file.buffer)
        .resize(2000, 1333, { fit: "cover" })
        .toFormat("jpeg")
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

const aliasTopTours = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "price";
  req.query.fields = "name,price,rating";
  next();
};

const getAllTours = factory.getAll(Tour);
const getTour = factory.getOne(Tour, { path: "reviews" }); //Model, popOption: for populate
const createTour = factory.createOne(Tour);
const updateTour = factory.updateOne(Tour);
const deleteTour = factory.deleteOne(Tour);

const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        numTours: { $sum: 1 }, // Sum of all tour documents
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    { $sort: { avgPrice: 1 } },
    // { $match: { _id: { $ne: "EASY" } } },
  ]);

  res.status(200).json({
    status: "success",
    data: stats, // No content to send back
  });
});

const getMonthlyPlan = catchAsync(async (req, res) => {
  const year = +req.params.year;
  const plan = await Tour.aggregate([
    { $unwind: "$startDates" },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" },
      },
    },
    { $addFields: { month: "$_id" } },
    {
      $project: {
        _id: 0,
      },
    },
    { $sort: { numTourStarts: -1 } },
    { $limit: 12 },
  ]);
  res.status(200).json({
    status: "success",
    data: plan, // No content to send back
  });
});

const getTourWithin = catchAsync(async (req, res, next) => {
  // /tours-within/:distance/center/:latlng/unit/:unit
  const { distance, latlng, unit } = req.params;

  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      tours,
    },
  });
});

const getDistances = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  const [lat, lng] = latlng.split(",");

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      distances,
    },
  });
});

module.exports = {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getTourWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages,
};
