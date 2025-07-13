const mongoose = require("mongoose");
const { default: slugify } = require("slugify");
// const User = require("./userModel");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A Tour must have a name."],
      unique: true,
      trim: true, // removes white space at beginning and end of phrase
      maxLength: [
        40,
        "A Tour name must have less or equal than 40 characters.",
      ],
      minLength: [
        10,
        "A Tour name must have more or equal than 10 characters.",
      ],
      // validate: [validator.isAlpha, "Tour name must only contain characters."],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A Tour must have a duration."],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A Tour must have a group size."],
    },
    difficulty: {
      type: String,
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either easy, medium or difficult",
      },
      required: [true, "A Tour must have a difficulty."],
    },
    price: {
      type: Number,
      min: [100, "A Tour must not be priced bellow 100$."],
      required: [true, "A Tour must have a price."],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // eslint-disable-next-line object-shorthand
        validator: function (val) {
          // this only point to current doc on NEW document create (not update)
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below regular price.",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rtaing must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      required: [true, "A Tour must have a summary."],
      trim: true, // removes white space at beginning and end of phrase
    },
    description: {
      type: String,
      trim: true, // removes white space at beginning and end of phrase
    },
    imageCover: {
      type: String,
      required: [true, "A Tour must have a cover image."],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // embedded
      // GeoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number], //longitude, latitude
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// tourSchema.index({ price: 1 }); //Single Indexing
tourSchema.index({ price: 1, ratingsAverage: -1 }); //Compound Indexing, also works when querying for only one field.
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create() commands // insertMany() doesn't trigger it.

tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

////////////////////
// Embedding (In case needed in the future)
// tourSchema.pre("save", async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });
////////////////////

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } }); //this referes to the query
  // this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v",
  }); //this referes to the query
  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre("aggregate", function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
