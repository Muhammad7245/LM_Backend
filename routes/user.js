const router = require("express").Router();
const User = require("../modals/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const saltRounds = 10;

// JWT Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ message: "Token missing" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// Admin check middleware
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const alreadyExist = await User.findOne({ email });
    if (alreadyExist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();

    res.status(200).json({
      user: { id: savedUser._id, name: savedUser.name, email: savedUser.email },
      message: "User registered successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect)
      return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👇 New: Add PDF to a user (Admin only)
router.post("/add-pdf", verifyToken, verifyAdmin, async (req, res) => {
  const { userId, filename, fileId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.pdfs.push({ filename, fileId: new mongoose.Types.ObjectId(fileId) });
    await user.save();

    res
      .status(200)
      .json({ message: "PDF metadata added to user", pdfs: user.pdfs });
  } catch (err) {
    res.status(500).json({ message: "Failed to add PDF", error: err });
  }
});

// 👇 New: Get logged-in user's PDFs
router.get("/my-pdfs", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.pdfs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch PDFs", error: err });
  }
});

// 👇 New: Get all users (Admin only)
router.get("/users", async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1; // Default to first page
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit;
    
    // Search parameters
    const searchQuery = req.query.search;
    const searchFilter = searchQuery 
      ? { 
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
          ]
        } 
      : {};
    
    // Get users with pagination and filtering
    const users = await User.find(
      searchFilter, 
      { password: 0 } // Exclude the password from the results
    )
    .sort({ createdAt: -1 }) // Sort by created date desc
    .skip(skip)
    .limit(limit);
    
    // Get total count for pagination
    const total = await User.countDocuments(searchFilter);
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// 👇 New: Get user by ID (Admin only)
router.get("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
});

// 👇 New: Update user (Admin only)
router.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    // Check if trying to update email to one that already exists
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({ 
      user: updatedUser,
      message: "User updated successfully" 
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
});

// 👇 New: Delete user (Admin only)
router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

module.exports = router;