/* eslint-disable */
import axios from "axios";
import { showAlert } from "./alerts";

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + charge credit card
    window.location.assign(session.data.session.url);
  } catch (err) {
    // console.log(err);
    showAlert(
      "error",
      (err.response && err.response.data && err.response.data.message) ||
        "Something went wrong!",
    );
  }
};
