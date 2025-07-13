const express = require("express");
const {
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
} = require("../controllers/userControllers");
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  restrictTo,
  logout,
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", logout);

router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);

// Protect all routes after this middleware
router.use(protect);

router.patch("/updateMyPassword", updatePassword); //for current logged in user.

router.get("/me", getMe, getUser); //for current logged in user.
router.patch("/updateMe", uploadUserPhoto, resizeUserPhoto, updateMe); //for current logged in user.
router.delete("/deleteMe", deleteMe); //for current logged in user.

// FOR ADMINDS
router.use(restrictTo("admin"));

router.route("/").get(getAllUsers).post(createUser);
router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser);
module.exports = router;
