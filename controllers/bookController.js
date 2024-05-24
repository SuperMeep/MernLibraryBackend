const Book = require("../models/bookModel");
const Borrow = require("../models/borrowModel");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const { uploadToFirebaseStorage } = require("../middleware/firebase");

// Define your genre options
const genreOptions = [
  "Action",
  "Romance",
  "Fantasy",
  "Drama",
  "Crime",
  "Adventure",
  "Thriller",
  "Sci-fi",
  "Music",
  "Family",
];

const getBooks = async (req, res) => {
  const user_id = req.user._id;
  const books = await Book.find({ user_id }).sort({ createdAt: -1 });

  res.status(200).json(books);
};

const getBooksBorrowed = async (req, res) => {
  const userId = req.user.userId;
  const borrows = await Borrow.find({ userId }).sort({ createdAt: -1 });
  res.status(200).json(borrows);
};

// get a book
const getBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such book" });
  }
  const book = await Book.findById(id);
  if (!book) {
    return res.status(404).json({ error: "No such book" });
  }
  res.status(200).json(book);
});

// create a book
const createBook = asyncHandler(async (req, res) => {
  // Destructuring request body and userId from req.user
  const { title, author, genre, ratings, stock, image } = req.body;
  const userId = req.user.userId;

  let emptyFields = [];

  if (!title) {
    emptyFields.push("title");
  }
  if (!author) {
    emptyFields.push("author");
  }

  if (!ratings) {
    emptyFields.push("ratings");
  }
  // if (!image) {
  //   emptyFields.push("image");
  // }
  // Validate the genre field
  if (!Array.isArray(genre) || genre.length === 0) {
    emptyFields.push("genre");
  }

  if (emptyFields.length > 0) {
    const error = new Error(
      "Please fill in all the required fields: " + emptyFields.join(", ")
    );
    res.status(400);
    throw error;
  }

  // Set stock to a default value of 1 if it's not provided
  const defaultStock = stock || 1;
  let imageUrl;

  if (req.file) {
    // Assuming you're using Firebase Storage, upload the file and get the download URL
    try {
      imageUrl = await uploadToFirebaseStorage(req.file);
    } catch (error) {
      console.error("Error uploading file to Firebase Storage:", error);
      res.status(500).json({ error: "Error uploading file" });
      return;
    }
  }

  // Create the book document using the Book model
  const book = await Book.create({
    title,
    author,
    genre,
    ratings,
    userId,
    stock: defaultStock,
    image,
  });

  // Return a 200 OK response with the created book
  res.status(200).json({ book });
});

// delete a book
const deleteBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("No such book");
  }
  const book = await Book.findOneAndDelete({ _id: id });
  if (!book) {
    res.status(400);
    throw new Error("No such book");
  }

  res.status(200).json(book);
});

// update a book
const updateBook = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array());
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("No such book");
  }

  // Now, update the book using valid data from req.body
  const book = await Book.findOneAndUpdate(
    { _id: id },
    { ...req.body },
    { new: true } // This ensures you get the updated book as the response
  );

  if (!book) {
    res.status(404);
    throw new Error("No such book");
  }

  res.status(200).json(book);
});

// Borrow a book
const borrowBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params; // Assuming the request body contains the bookId
  const userId = req.user.userId; // Extract the userId from the token

  // Check if the user already borrowed this book
  const existingBorrow = await Borrow.findOne({ userId, bookId });
  if (existingBorrow) {
    res.status(409);
    throw new Error("Book already borrowed");
  }

  // Check if the book is in stock
  const book = await Book.findById(bookId);
  if (!book) {
    res.status(400);
    throw new Error("Book not found");
  }

  if (book.stock > 0) {
    // Create a new Borrow document
    const borrow = new Borrow({
      userId,
      book: {
        title: book.title,
        genre: book.genre,
        author: book.author,
        ratings: book.ratings,
        stock: book.stock,
      },
      bookId,
      borrowDate: new Date(),
    });

    // Save the borrow document to the database
    await borrow.save();

    // Reduce stock by 1 when borrowed
    book.stock--;
    await book.save();

    const borrowId = borrow._id;
    return res.status(200).json({
      borrowId,
      userId,
      bookId,
      book: {
        title: book.title,
        genre: book.genre,
        author: book.author,
        ratings: book.ratings,
        stock: book.stock,
      },
    });
  } else {
    res.status(400);
    throw new Error("Book is out of stock");
  }
});

// Return a book
const returnBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params; // Assuming the request body contains the bookId
  const userId = req.user.userId; // Extract the userId from the token

  // Find the Borrow document for the book
  const borrow = await Borrow.findOne({ userId, bookId, returnDate: null });
  if (!borrow) {
    res.status(400);
    throw new Error("You did not borrow this book");
  }

  // Delete the Borrow document by its _id
  await Borrow.findByIdAndDelete(borrow._id);

  // Update the stock count in the Book model (as you're already doing)
  const book = await Book.findById(bookId);
  book.stock++;
  book.borrowedBy = null;
  await book.save();

  res.status(200).json({ message: "Book returned successfully" });
});

module.exports = {
  createBook,
  getBooks,
  getBooksBorrowed,
  getBook,
  deleteBook,
  updateBook,
  borrowBook,
  returnBook,
};
