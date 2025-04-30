const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
dotenv.config();
const PORT = process.env.PORT || 5000;

// Import routes before connecting - they'll wait for the connection
const appointmentRoute = require("./routes/appointment");
const userRoute = require("./routes/user");
const pdfRoute = require("./routes/pdf"); // This now handles its own connection waiting

// Use routes
app.use("/api", pdfRoute);
app.use("/api", appointmentRoute);
app.use("/api", userRoute);

// Connect to MongoDB
mongoose
  .connect(process.env.db)
  .then(() => {
    console.log("Database connected successfully ✅");
    
    // Start server after database connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Error in database connection: ${err}`);
    process.exit(1); // Exit if database connection fails
  });