import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';
import moment from 'moment';
import { generateQRCode } from './whatsapp.js';
import { uploadToS3 } from './s3.js';


export const generateTicket = async (ticket: any) => {
  const qrCode = await generateQRCode(ticket.qrCode);

  const eventDate = moment(ticket.eventStart).format('MMMM Do YYYY');
  const eventTime = moment(ticket.eventStart).format('h:mm a');
  const ticketType = ticket.ticketTypeName || 'General Admission';
  const purchaser = ticket.nameOnTicket || 'Unknown Purchaser';
  const venue = ticket.address || 'Unknown Venue';
  const eventTitle = ticket.eventTitle;
  const location = ticket.location || 'No specific location';

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 450]);
  const { width, height } = page.getSize();

  const purple = rgb(106 / 255, 119 / 255, 215 / 255);
  const black = rgb(0, 0, 0);
  const lightGray = rgb(0.95, 0.95, 0.95);

  // Set fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Draw outer grey layer
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: lightGray,
  });

  // --- Ticket Content Area ---
  const topMargin = 60;
  const horizontalMargin = 40;
  const bottomMargin = 0; // No bottom margin

  const contentX = horizontalMargin;
  const contentY = bottomMargin;
  const contentWidth = width - 2 * horizontalMargin;
  const contentHeight = height - topMargin - bottomMargin;
  const contentTop = contentY + contentHeight;

  // Draw the inner white container
  page.drawRectangle({
    x: contentX,
    y: contentY,
    width: contentWidth,
    height: contentHeight,
    color: rgb(1, 1, 1), // white
  });

  // --- Logo ---
  const logoUrl = 'https://mukoto-bucket.s3.af-south-1.amazonaws.com/logo-min.png';
  const logoImageBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoImageBytes);
  const logoAspectRatio = logoImage.width / logoImage.height;
  const logoWidth = 150;
  const logoHeight = logoWidth / logoAspectRatio;

  page.drawImage(logoImage, {
    x: contentX + 40,
    y: contentTop - 90,
    width: logoWidth,
    height: logoHeight,
  });

  // --- Left column ---
  const leftColumnX = contentX + 20;
  const qrCodeSize = 120;

  // QR Code
  try {
    const qrCodeImageBytes = await fetch(qrCode).then((res) =>
      res.arrayBuffer()
    );
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
    page.drawImage(qrCodeImage, {
      x: leftColumnX + 20,
      y: contentY + (contentHeight - qrCodeSize) / 2,
      width: qrCodeSize,
      height: qrCodeSize,
    });
  } catch (error) {
    console.log(error);
  }

  // --- Right column ---
  const rightColumnX = contentX + 240;
  const valueOffsetX = 100;
  const titleFontSize = 14;
  const detailFontSize = 14;

  // My Big Event
  page.drawText(eventTitle, {
    x: rightColumnX,
    y: contentTop - 60,
    font: helveticaBold,
    size: 24,
    color: black,
  });

  // Date and Time
  page.drawText('Date:', {
    x: rightColumnX,
    y: contentTop - 100,
    font: helveticaBold,
    size: titleFontSize,
    color: black,
  });
  page.drawText(eventDate, {
    x: rightColumnX + valueOffsetX,
    y: contentTop - 100,
    font: helvetica,
    size: detailFontSize,
    color: black,
  });

  page.drawText('Time:', {
    x: rightColumnX,
    y: contentTop - 125,
    font: helveticaBold,
    size: titleFontSize,
    color: black,
  });
  page.drawText(eventTime, {
    x: rightColumnX + valueOffsetX,
    y: contentTop - 125,
    font: helvetica,
    size: detailFontSize,
    color: black,
  });

  // Location & Directions
  page.drawText('Location:', {
    x: rightColumnX,
    y: contentTop - 155,
    font: helveticaBold,
    size: titleFontSize,
    color: black,
  });
  page.drawText(location, {
    // Placeholder
    x: rightColumnX + valueOffsetX,
    y: contentTop - 155,
    font: helvetica,
    size: detailFontSize,
    color: black,
  });
  page.drawText('Directions:', {
    x: rightColumnX,
    y: contentTop - 175,
    font: helveticaBold,
    size: titleFontSize,
    color: black,
  });
  page.drawText(venue, {
    x: rightColumnX + valueOffsetX,
    y: contentTop - 175,
    font: helvetica,
    size: detailFontSize,
    color: black,
  });

  // Ticket Details
  page.drawText('Ticket Holder:', {
    x: rightColumnX,
    y: contentTop - 205,
    font: helveticaBold,
    size: titleFontSize,
    color: black,
  });
  page.drawText(purchaser, {
    x: rightColumnX + valueOffsetX,
    y: contentTop - 205,
    font: helvetica,
    size: detailFontSize,
    color: black,
  });

  page.drawText('Ticket Type:', {
    x: rightColumnX,
    y: contentTop - 225,
    font: helveticaBold,
    size: titleFontSize,
    color: black,
  });
  page.drawText(ticketType, {
    x: rightColumnX + valueOffsetX,
    y: contentTop - 225,
    font: helvetica,
    size: detailFontSize,
    color: black,
  });

  // "Add to calendar" button
  const calendarButtonY = contentTop - 280;
  page.drawRectangle({
    x: rightColumnX,
    y: calendarButtonY,
    width: 140,
    height: 30,
    color: purple,
  });
  page.drawText('Add to calendar', {
    x: rightColumnX + 25,
    y: calendarButtonY + 10,
    font: helveticaBold,
    size: 12,
    color: rgb(1, 1, 1),
  });

  // Add to Calendar Link
  const eventEnd = moment(ticket.eventStart).add(2, 'hours'); // Assuming 2 hour duration
  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${moment(ticket.eventStart).utc().format('YYYYMMDDTHHmmss') + 'Z'}/${moment(eventEnd).utc().format('YYYYMMDDTHHmmss') + 'Z'}&details=${encodeURIComponent(
    `Ticket Holder: ${purchaser}`
  )}&location=${encodeURIComponent(venue)}`;

  const link = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [rightColumnX, calendarButtonY, rightColumnX + 140, calendarButtonY + 30],
    Border: [0, 0, 0],
    C: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: pdfDoc.context.obj(googleCalendarUrl),
    },
  });
  page.node.set(pdfDoc.context.obj('Annots'), pdfDoc.context.obj([link]));

  // Vertical line separator
  page.drawLine({
    start: { x: contentX + 220, y: contentTop - 20 },
    end: { x: contentX + 220, y: contentY + 20 },
    thickness: 1,
    color: purple,
  });

  const pdfBytes = await pdfDoc.save();

  try {
    const s3Url = await uploadToS3(Buffer.from(pdfBytes), 'pdf');
    console.log(`PDF uploaded to S3: ${s3Url}`);
    
    return {
      pdfName: ticket.nameOnTicket || 'Ticket',
      pdfUrl: s3Url,
    };
  } catch (err) {
    console.log('Error creating PDF:', err);
    return null;
  }
};