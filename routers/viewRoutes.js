const express = require("express");

const {
  getOverview,
  getTour,
  getLoginForm,
  getAccount,
  getMyTours,
  updateUserData,
} = require("../controllers/viewsController");
const { isLoggedIn, protect } = require("../controllers/authController");

const router = express.Router();

router.get("/", isLoggedIn, getOverview);

router.get("/tours/:slug", isLoggedIn, getTour);

router.get("/login", isLoggedIn, getLoginForm);

router.get("/me", protect, getAccount);

router.get("/my-tours", protect, getMyTours);

router.post("/submit-user-data", protect, updateUserData);

module.exports = router;
