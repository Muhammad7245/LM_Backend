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
    price,
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
    price,
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

router.delete("/delete/:id", async (req, res) => {
  const appointmentId = req.params.id;
  try {
    const deletedAppointment = await Appointment.findByIdAndDelete(appointmentId);
    if (!deletedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(200).json({ message: "Appointment deleted successfully", deletedAppointment: deletedAppointment.name });
  } catch (err) {
    res.status(500).json({ message: "Error deleting appointment", error: err });
  }
});
router.put("/update/:id", async (req, res) => {
  const appointmentId = req.params.id;
  const updatedData = req.body;
  try {
    const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, updatedData, { new: true });
    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(200).json({ message: "Appointment updated successfully", updatedAppointment });
  } catch (err) {
    res.status(500).json({ message: "Error updating appointment", error: err });
  }
});

module.exports = router;
