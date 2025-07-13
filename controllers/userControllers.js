const multer = require("multer");
const sharp = require("sharp");

const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("../utils/handleFactory");

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users");
//   },
//   filename: (req, file, cb) => {
//     //user-id-currenttimestamp.jpeg
//     const extention = file.mimetype.split("/")[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${extention}`);
//   },
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const uploadUserPhoto = upload.single("photo");

const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`; //it'll always be jpeg bcs we converting it in sharp anyway

  await sharp(req.file.buffer)
    .resize(500, 500, { fit: "cover" })
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

const getMe = (req, res, next) => {
  req.params.id = req.user.id;

  next();
};

const updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);

  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400,
      ),
    );

  // 2) Filtered out field names that are not allowed to be updated
  if (req.file.fieldname === "photo") req.body.photo = req.file.filename;
  const filteredBody = filterObj(req.body, "name", "email", "photo");

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    { new: true, runValidators: true }, //new to return the newely updated document
  );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  return res.status(204).json({
    status: "success",
    data: null,
  });
});

const createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined, Please use /signup instead.",
  });
};

const getAllUsers = factory.getAll(User);
const getUser = factory.getOne(User);
const updateUser = factory.updateOne(User); // Do NOT update passwords with this!
const deleteUser = factory.deleteOne(User);

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateMe,
  deleteMe,
  getMe,
  uploadUserPhoto,
  resizeUserPhoto,
};
