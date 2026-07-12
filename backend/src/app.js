const express = require("express");
const cors = require("cors");
const attendanceRoutes = require("./routes/attendance");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const agencyRoutes = require("./routes/agencies");
const dtrRoutes = require("./routes/dtr");
const inChargeRoutes = require("./routes/incharge");
const holidayRoutes = require("./routes/holidays");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS,
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/agencies", agencyRoutes);
app.use("/api/dtr", dtrRoutes);
app.use("/api/incharge", inChargeRoutes);
app.use("/api/holidays", holidayRoutes);

module.exports = app;
