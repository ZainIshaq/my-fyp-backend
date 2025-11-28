const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
require("dotenv").config();

let otpStorage = {}; // Temporary storage for OTPs

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,  // ✅ Secure
    pass: process.env.EMAIL_PASS,  // ✅ Use App Password
  },
});

module.exports = {
  // 🔹 1️⃣ Register User with OTP Verification
  registerUser: async (req, res) => {
    try {
      const { Name, Email, Password, Age } = req.body;

      // Check if email is already registered
      const existingUser = await User.findOne({ where: { Email } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
      otpStorage[Email] = otp;

      // Send OTP email
      const mailOptions = {
        from: `"DEF" <${process.env.EMAIL_USER}>`,
        to: Email,
        subject: "Your OTP Code",
        text: `Your OTP code is: ${otp}`,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },



  // 🔹 2️⃣ Verify OTP and Complete Registration
  verifyOtp: async (req, res) => {
    try {
      const { Name, Email, Password, Age, OTP } = req.body;

      if (!otpStorage[Email] || otpStorage[Email] !== parseInt(OTP)) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (!Password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(Password, 10);

      // Save user to database
      await User.create({ Name, Email, Password: hashedPassword, Age });

      // Remove OTP after successful verification
      delete otpStorage[Email];

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },




  // 🔹 3️⃣ Forgot Password - Send OTP
  forgotPassword: async (req, res) => {
    try {
      const { Email } = req.body;

      // Check if email exists in the database
      const user = await User.findOne({ where: { Email } });
      if (!user) {
        return res.status(400).json({ message: "Email is not registered" });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
      otpStorage[Email] = otp;

      // Send OTP via email
      const mailOptions = {
        from: `"DEF" <${process.env.EMAIL_USER}>`,
        to: Email,
        subject: "Reset Password OTP",
        text: `Your OTP code to reset your password is: ${otp}`,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },





  // 🔹 4️⃣ Verify OTP & Reset Password
  verifyOtpAndResetPassword: async (req, res) => {
    try {
      const { Email, OTP, NewPassword } = req.body;

      // Check if OTP matches
      if (!otpStorage[Email] || otpStorage[Email] !== parseInt(OTP)) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(NewPassword, 10);

      // Update password in database
      await User.update({ Password: hashedPassword }, { where: { Email } });

      // Remove OTP from storage
      delete otpStorage[Email];

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },




  loginUser: async (req, res) => {
    try {
      const { Email, Password } = req.body;

      // Check if user exists
      const user = await User.findOne({ where: { Email } });
      if (!user) {
        return res.status(400).json({ message: "User not found. Please register first." });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(Password, user.Password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.id, Email: user.Email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" } // Token valid for 7 days
      );

      // Send response with token
      res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          Name: user.Name,
          Email: user.Email,
          Age:user.Age,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};
