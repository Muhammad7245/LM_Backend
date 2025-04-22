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
// import routes 
const appointmentRoute = require("./routes/appointment");
app.use("/api", appointmentRoute);


mongoose
  .connect(process.env.db)
  .then(() => {
    console.log("database connect");
  })
  .catch((err) => {
    console.log(`error in databse connection ${err}`);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
