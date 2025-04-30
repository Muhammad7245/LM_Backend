// routes/pdf.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const mongoose = require("mongoose");

// Import Models
const Pdf = require('../modals/pdf'); // Adjust path if needed
const User = require('../modals/User'); // Adjust path if needed

// --- Multer Configuration ---

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads'); // Go up one level from routes
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
} else {
  console.log(`Uploads directory exists at: ${uploadsDir}`);
}

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir); // Use the absolute path
  },
  filename: function(req, file, cb) {
    // Create a unique filename to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext); // e.g., pdf-1678886400000-123456789.pdf
  }
});

// File filter to allow only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // Accept PDF files
  } else {
    // Reject other files
    cb(new Error('Invalid file type: Only PDF files are allowed.'), false);
  }
};

// Create the multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- API Routes ---

/**
 * @route   POST /api/pdfs
 * @desc    Upload a PDF for a specific user
 * @access  Private (should be protected in a real app)
 */
router.post("/pdfs", upload.single("pdf"), async (req, res) => { // Match frontend key 'pdf'
  // Check if file exists from multer
  if (!req.file) {
    return res.status(400).json({ message: "No PDF file provided or invalid file type." });
  }

  // Get data from the request body
  const { userId, title, description, tags, access } = req.body;

  // --- Validation ---
  if (!userId) {
    // Clean up uploaded file if userId is missing
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "User ID is required." });
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
     // Clean up uploaded file if userId is invalid
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Invalid User ID format." });
  }
   if (!title || title.trim() === '') {
     // Clean up uploaded file if title is missing
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "PDF Title is required." });
  }
  // --- End Validation ---

  try {
    // Find the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
       // Clean up uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Target user not found." });
    }

    // Create new PDF document
    const newPdf = new Pdf({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path, // Store the full path or relative based on your setup
      size: req.file.size,
      title: title,
      description: description,
      tags: tags ? JSON.parse(tags) : [], // Parse tags if they exist
      access: access || 'public',
      uploadedFor: targetUser._id // Link to the target user
      // uploadedByAdmin: req.user._id // If you have auth middleware and want to track the admin
    });

    // Save the PDF document
    const savedPdf = await newPdf.save();

    // Update the target user's pdfs array
    targetUser.pdfs.push(savedPdf._id);
    await targetUser.save();

    console.log(`PDF ${savedPdf.filename} uploaded for user ${targetUser.email}`);

    res.status(201).json({
      message: "PDF uploaded and associated with user successfully.",
      pdf: {
         _id: savedPdf._id,
         filename: savedPdf.filename,
         originalname: savedPdf.originalname,
         title: savedPdf.title,
         uploadedAt: savedPdf.uploadedAt,
         uploadedFor: savedPdf.uploadedFor
      }
    });

  } catch (error) {
    console.error("Error uploading PDF:", error);
    // Clean up uploaded file in case of database error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
       try {
           fs.unlinkSync(req.file.path);
           console.log("Cleaned up orphaned file:", req.file.filename);
       } catch (unlinkErr) {
           console.error("Error cleaning up orphaned file:", unlinkErr);
       }
    }

    // Handle potential JSON parsing errors for tags
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return res.status(400).json({ message: "Invalid format for tags. Ensure it's a valid JSON array string." });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: "Server error during PDF upload.", error: error.message });
  }
});

/**
 * @route   GET /api/pdfs/:filename
 * @desc    Get/Download a specific PDF file
 * @access  Public/Private (adjust as needed)
 */
router.get("/pdfs/:filename", async (req, res) => {
  try {
    const pdf = await Pdf.findOne({ filename: req.params.filename });

    if (!pdf) {
      return res.status(404).json({ message: "PDF record not found in database." });
    }

    // Use the path stored in the DB document
    const filePath = pdf.path; // Assumes pdf.path stores the correct, accessible path

    // Check if file exists at the stored path
    if (!fs.existsSync(filePath)) {
       console.error(`File not found on server at path: ${filePath} for filename: ${pdf.filename}`);
       // Optionally try to construct path if only filename was stored previously
       // const fallbackPath = path.join(uploadsDir, pdf.filename);
       // if (!fs.existsSync(fallbackPath)) { ... }
      return res.status(404).json({ message: "File not found on server filesystem." });
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/pdf');
    // Use 'inline' to display in browser, 'attachment' to force download
    res.setHeader('Content-Disposition', `inline; filename="${pdf.originalname}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
        console.error("Error streaming file:", err);
        res.status(500).json({ message: "Error streaming file." });
    });

  } catch (error) {
    console.error("Error retrieving PDF:", error);
    res.status(500).json({ message: "Server error retrieving PDF.", error: error.message });
  }
});

/**
 * @route   GET /api/pdfs/user/:userId
 * @desc    Get all PDFs associated with a specific user
 * @access  Private (should be protected)
 */
router.get("/pdfs/user/:userId", async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid User ID format." });
    }

    try {
        // Find PDFs where 'uploadedFor' matches the userId
        // Select only necessary fields to send back
        const userPdfs = await Pdf.find({ uploadedFor: userId })
                                  .select('filename originalname title uploadedAt size tags access') // Adjust fields as needed
                                  .sort({ uploadedAt: -1 });

        if (!userPdfs) { // find returns empty array if none found, not null
           return res.status(404).json({ message: "No PDFs found for this user." });
        }

        res.json(userPdfs);

    } catch (error) {
        console.error("Error fetching user PDFs:", error);
        res.status(500).json({ message: "Server error fetching user PDFs.", error: error.message });
    }
});


/**
 * @route   DELETE /api/pdfs/:pdfId
 * @desc    Delete a PDF record and its file
 * @access  Private (should be protected)
 */
router.delete("/pdfs/:pdfId", async (req, res) => {
   const { pdfId } = req.params;

   if (!mongoose.Types.ObjectId.isValid(pdfId)) {
       return res.status(400).json({ message: "Invalid PDF ID format." });
   }

   try {
       // Find the PDF document by its _id
       const pdf = await Pdf.findById(pdfId);

       if (!pdf) {
           return res.status(404).json({ message: "PDF record not found." });
       }

       const filePath = pdf.path;

       // Delete the document from the database FIRST
       await Pdf.deleteOne({ _id: pdfId });

       // Then, remove the PDF reference from the associated User's pdfs array
       await User.updateOne(
           { _id: pdf.uploadedFor },
           { $pull: { pdfs: pdfId } } // Remove the pdfId from the array
       );

       // Finally, delete the file from the filesystem
       if (fs.existsSync(filePath)) {
           fs.unlink(filePath, (err) => { // Use async unlink
               if (err) {
                   // Log error but don't fail the request if DB cleanup was successful
                   console.error(`Error deleting file ${filePath}:`, err);
                   return res.json({
                       message: "PDF record deleted from database and user, but file deletion failed. Please check server logs.",
                       dbSuccess: true,
                       fileDeleted: false
                   });
               }
               console.log(`Deleted file: ${filePath}`);
               res.json({ message: "PDF deleted successfully from database, user, and filesystem.", dbSuccess: true, fileDeleted: true });
           });
       } else {
           console.warn(`File not found for deletion: ${filePath}`);
           res.json({ message: "PDF record deleted from database and user, but the physical file was not found.", dbSuccess: true, fileDeleted: false });
       }

   } catch (error) {
       console.error("Error deleting PDF:", error);
       res.status(500).json({ message: "Server error deleting PDF.", error: error.message });
   }
});


// You might want a route to list ALL pdfs (for admin purposes)
// router.get("/pdfs", async (req, res) => { ... });

module.exports = router;