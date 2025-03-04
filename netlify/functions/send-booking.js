const nodemailer = require('nodemailer');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
const dbDir = path.join(__dirname, '../../.netlify/data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
let db;
const initializeDatabase = async () => {
  db = await open({
    filename: path.join(dbDir, 'bookings.db'),
    driver: sqlite3.Database
  });

  // Create bookings table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      services TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database initialized');
  return db;
};

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Validate Irish phone number
const validateIrishPhone = (phone) => {
  // Remove spaces for validation
  const cleanPhone = phone.replace(/\s/g, '');
  const phoneRegex = /^08[0-9][0-9]{7}$/;
  return phoneRegex.test(cleanPhone);
};

// Send data to make.com webhook
const sendToMakeWebhook = async (bookingData) => {
  try {
    const webhookUrl = 'https://hook.eu2.make.com/2qicg95neilach1j726sdqa6ib8v2mnt';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.text();
    console.log('Webhook response:', responseData);
    return true;
  } catch (error) {
    console.error('Error sending to webhook:', error);
    return false;
  }
};

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const {
      firstName,
      lastName,
      email,
      phone,
      services,
      date,
      time,
      location,
      message
    } = body;

    // Basic validation
    if (!firstName || !lastName || !email || !phone || !services || !date || !time || !location) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'All required fields must be provided' 
        })
      };
    }

    // Validate Irish phone number - accept both formats
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^08[0-9][0-9]{7}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'Please provide a valid Irish mobile number (08xxxxxxxx or 08x xxx xxxx)' 
        })
      };
    }

    // Format the services array into a string
    const servicesString = Array.isArray(services) 
      ? services.join(', ') 
      : services;

    // Prepare booking data for database and webhook
    const bookingData = {
      firstName,
      lastName,
      email,
      phone,
      services: servicesString,
      date,
      time,
      location,
      message: message || '',
      created_at: new Date().toISOString()
    };

    try {
      // Initialize database
      const db = await initializeDatabase();

      // Check if the time slot is already booked
      const existingBooking = await db.get(
        'SELECT id FROM bookings WHERE date = ? AND time = ?',
        [date, time]
      );
      
      if (existingBooking) {
        return {
          statusCode: 409,
          body: JSON.stringify({ 
            success: false, 
            message: 'This time slot has already been booked. Please select another time.' 
          })
        };
      }
      
      // Save booking to database
      await db.run(
        `INSERT INTO bookings (firstName, lastName, email, phone, services, date, time, location, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, email, phone, servicesString, date, time, location, message || '']
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with email sending even if database fails
    }

    // Send data to make.com webhook
    await sendToMakeWebhook(bookingData);

    try {
      // Create email transporter
      const transporter = createTransporter();

      // Format date for better readability
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to your business email
        subject: `New Booking: ${servicesString} - ${firstName} ${lastName}`,
        html: `
          <h2>New Booking Request</h2>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          
          <h3>Booking Details</h3>
          <p><strong>Services:</strong> ${servicesString}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Location:</strong> ${location}</p>
          
          <h3>Additional Information</h3>
          <p>${message || 'No additional information provided.'}</p>
        `,
        text: `
          New Booking Request
          Date: ${new Date().toLocaleString()}
          
          Customer Information
          Name: ${firstName} ${lastName}
          Email: ${email}
          Phone: ${phone || 'Not provided'}
          
          Booking Details
          Services: ${servicesString}
          Date: ${formattedDate}
          Time: ${time}
          Location: ${location}
          
          Additional Information
          ${message || 'No additional information provided.'}
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);
      
      // Send confirmation email to customer
      const confirmationEmail = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Booking Confirmation - Touch Media Ltd.`,
        html: `
          <h2>Thank You for Your Booking!</h2>
          <p>Dear ${firstName},</p>
          <p>We have received your booking request for ${servicesString} on ${formattedDate} at ${time}.</p>
          <p>Our team will review your request and get back to you shortly to confirm your appointment.</p>
          
          <h3>Your Booking Details</h3>
          <p><strong>Services:</strong> ${servicesString}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Location:</strong> ${location}</p>
          
          <p>If you need to make any changes to your booking, please contact us at ${process.env.EMAIL_USER}.</p>
          
          <p>Best regards,</p>
          <p>Touch Media Ltd. Team</p>
        `,
        text: `
          Thank You for Your Booking!
          
          Dear ${firstName},
          
          We have received your booking request for ${servicesString} on ${formattedDate} at ${time}.
          Our team will review your request and get back to you shortly to confirm your appointment.
          
          Your Booking Details
          Services: ${servicesString}
          Date: ${formattedDate}
          Time: ${time}
          Location: ${location}
          
          If you need to make any changes to your booking, please contact us at ${process.env.EMAIL_USER}.
          
          Best regards,
          Touch Media Ltd. Team
        `
      };
      
      await transporter.sendMail(confirmationEmail);
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Continue even if email fails
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Booking submitted successfully!' })
    };
  } catch (error) {
    console.error('Error sending email or saving booking:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Failed to send booking. Please try again.' })
    };
  }
};