const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let users = []; // In-memory storage for users and reminders

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get('/users', (req, res) => {
  res.json(users);
});

app.post('/signup', async (req, res) => {
  const { email, password, waterAmount, reminderCount } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const reminderTimes = calculateReminderTimes(reminderCount);
    const newUser = { email, password: hashedPassword, waterAmount, reminders: reminderTimes };
    users.push(newUser);

    res.status(201).json({ message: 'User registered and reminders set successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user or setting reminders', error });
  }
});

function calculateReminderTimes(reminderCount) {
  const interval = 24 / reminderCount;
  const reminderTimes = [];
  for (let i = 0; i < reminderCount; i++) {
    const time = new Date();
    time.setHours(Math.floor(i * interval), 0, 0, 0);
    reminderTimes.push(time.toTimeString().slice(0, 5)); // Store as HH:MM
  }
  return reminderTimes;
}

function sendReminderEmail(email, waterAmount) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Water Reminder',
    text: `It's time to drink water! Your daily goal is ${waterAmount} liters. Stay hydrated!`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log(`Email sent to ${email}: ${info.response}`);
    }
  });
}

function checkReminders() {
  const currentTime = new Date().toTimeString().slice(0, 5); // Get current time in HH:MM format

  users.forEach(user => {
    user.reminders.forEach(reminderTime => {
      if (Math.abs(new Date(`1970-01-01T${currentTime}:00`).getTime() - new Date(`1970-01-01T${reminderTime}:00`).getTime()) <= 60000) {
        sendReminderEmail(user.email, user.waterAmount);
      }
    });
  });
}

setInterval(checkReminders, 60000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
