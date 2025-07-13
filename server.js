require("dotenv").config({ path: "./config.env" }); // load .env once
const mongoose = require("mongoose");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1); // Exit immediately
});

const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB)
  .then(() => console.log("✅ MongoDB connected successfully!"));

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App listening on port ${port}...`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥 Shutting down...");
  console.error(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal (graceful shutdown)
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully...");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
