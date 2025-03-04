const nodemailer = require('nodemailer');

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
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'All fields are required' })
      };
    }

    // Create email transporter
    const transporter = createTransporter();

    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to your business email
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Contact Information</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        
        <h3>Message</h3>
        <p>${message}</p>
      `,
      text: `
        New Contact Form Submission
        Date: ${new Date().toLocaleString()}
        
        Contact Information
        Name: ${name}
        Email: ${email}
        
        Message
        ${message}
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    // Send confirmation email to customer
    const confirmationEmail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Thank you for contacting Touch Media Ltd.`,
      html: `
        <h2>Thank You for Contacting Us!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        
        <p>Best regards,</p>
        <p>Touch Media Ltd. Team</p>
      `,
      text: `
        Thank You for Contacting Us!
        
        Dear ${name},
        
        We have received your message and will get back to you as soon as possible.
        
        Best regards,
        Touch Media Ltd. Team
      `
    };
    
    await transporter.sendMail(confirmationEmail);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Message sent successfully!' })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Failed to send message. Please try again.' })
    };
  }
};