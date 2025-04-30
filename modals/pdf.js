const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema({
  filename: { // The unique name stored on the server
    type: String,
    required: true,
    unique: true // Good practice to ensure uniqueness
  },
  originalname: { // The original name of the file uploaded by the user
    type: String,
    required: true
  },
  path: { // Server path where the file is stored
    type: String,
    required: true
  },
  size: { // File size in bytes
    type: Number,
    required: true
  },
  title: { // Title provided by the uploader in the modal
    type: String,
    required: [true, 'PDF title is required'], // Make title mandatory
    trim: true
  },
  description: { // Optional description
    type: String,
    trim: true
  },
  tags: [{ // Array of tags
    type: String,
    trim: true
  }],
  access: { // Access control (e.g., 'public', 'private')
    type: String,
    enum: ['public', 'private'], // Enforce allowed values
    default: 'public'
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  // Link to the User this PDF belongs to (the user selected in the table)
  uploadedFor: { // Renamed from uploadedBy for clarity in this context
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true // A PDF must be associated with a user
  },
  // Optional: Keep track of who uploaded it if admins upload for others
  // uploadedByAdmin: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "User",
  // },
});

// Add index for faster querying by user
pdfSchema.index({ uploadedFor: 1, uploadedAt: -1 });

module.exports = mongoose.model("Pdf", pdfSchema);