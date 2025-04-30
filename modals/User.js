// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure email is unique
    lowercase: true, // Store emails consistently
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // Enforce roles
    default: "user",
  },
  // Store references to the PDFs associated with this user
  pdfs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pdf", // Reference the 'Pdf' model
    }
  ]
}, { timestamps: true }); // Add createdAt and updatedAt timestamps automatically

module.exports = mongoose.model("User", userSchema);