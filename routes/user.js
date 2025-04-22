const router = require(`express`).Router();
const User = require("../modals/User");
const bcrypt = require("bcrypt");
// Number of salt rounds
const saltRounds = 10;

router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
      // Check if user already exists
      const alreadyExist = await User.findOne({ email });
      if (alreadyExist) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Create new user with hashed password
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
      });
  
      const savedUser = await newUser.save();
  
      res.status(200).json({
        user: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
        },
        message: "User registered successfully",
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Server error", error: err });
    }
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // 1. Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // 2. Compare input password with hashed password
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({ message: "Incorrect password" });
      }
  
      // 3. Success
      res.status(200).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        message: "Login successful",
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error", error: err });
    }
  });
  
module.exports = router;
