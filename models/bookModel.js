const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
    },
    author: {
      type: String,
      required: [true, "Please add an author"],
    },
    genre: {
      type: [String],
      required: [true, "Please add a genre"],
    },
    // Specify the allowed genres
    ratings: {
      type: Number,
      required: [true, "Please add a rating"],
    },
    stock: {
      type: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    image: {
      type: String, // Assuming you store the URL
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
