const APIFeatures = require("./apiFeatures");
const AppError = require("./appError");
const catchAsync = require("./catchAsync");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) return next(new AppError("No document found with that ID", 404));

    res.status(204).json({
      status: "success",
      data: null, // No content to send back
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Run validation on the updated data
    });

    if (!doc) return next(new AppError("No Document found with that ID", 404));

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.create(req.body);
    return res.status(201).json({
      data: { status: "success", data: doc },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested Get reviews on Tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // EXECUTE QUERY
    // const docs = await features.query.explain();
    const docs = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: "success",
      results: docs.length,
      data: { docs },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) return next(new AppError("No Document found with that ID", 404));

    res.status(200).json({ status: "success", data: { doc } });
  });
