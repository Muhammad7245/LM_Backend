const router = require(`express`).Router();
const Appointment = require("../modals/Appointment");

router.post("/book", async (req, res) => {
  const {
    date,
    email,
    instructions,
    location,
    name,
    phone,
    serviceType,
    test,
    time,
  } = req.body;
  const appointment = new Appointment({
    date,
    email,
    instructions,
    location,
    name,
    phone,
    serviceType,
    test,
    time,
  });

  try {
    const savedAppointment = await appointment.save();
    res.status(200).json({
      savedAppointment: savedAppointment,
      message: "Appointment booked successfully",
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/all-appointments", async (req, res) => {
  try {
    const allappointments = await Appointment.find();

    if (!allappointments || allappointments.length === 0) {
      return res.status(404).json({ message: "No appointments found" });
    }

    res.status(200).json({ allappointments });
  } catch (err) {
    res.status(500).json({ message: "Error retrieving appointments", error: err });
  }
});

module.exports = router;
