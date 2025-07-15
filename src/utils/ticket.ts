import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import { fileURLToPath } from 'url';
import { generateQRCode } from './whatsapp.js';

export const generateTicket = async (ticket: any) => {
  const qrCode = await generateQRCode(ticket.qrCode);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const dateTime = moment(ticket.eventStart).format(
    'dddd, MMMM Do YYYY, h:mm:ss a'
  );
  const ticketType = ticket.ticketTypeName || 'General Admission';
  const ticketPrice = `USD $${ticket.pricePaid}`;
  const purchaser = ticket.nameOnTicket || 'Unknown Purchaser';
  const venue = ticket.address || 'Unknown Venue';
  const organiser = ticket.organiserName;
  const eventTitle = ticket.eventTitle;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([1000, 800]);
  const { width, height } = page.getSize();
  const xMargin = 40;
  const rectHeight = 380;

  // const lightGray = '#cccccc';
  const opacity = 0.3;

  page.drawRectangle({
    x: xMargin,
    y: height - 400,
    width: width - xMargin * 2,
    height: rectHeight,
    color: rgb(0.8, 0.8, 0.8),
    opacity,
  });

  // Set title
  const title = eventTitle;
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const titleSize = 24;
  const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
  const textX = (width - titleWidth) / 2;

  page.drawText(title, {
    x: textX,
    y: height - 70,
    size: titleSize,
    font: titleFont,
    color: rgb(0, 0, 0),
  });

  // Set date and time
  // const dateTime = moment(ticket.event_date).format('dddd, MMMM Do YYYY, h:mm:ss a');
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const regularSize = 18;
  const dateTimeWidth = regularFont.widthOfTextAtSize(dateTime, regularSize);
  const dateTimeTextX = (width - dateTimeWidth) / 2;
  page.drawText(dateTime, {
    x: dateTimeTextX,
    y: height - 100,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  // Set ticket info
  page.drawText('TICKET #', {
    x: 120,
    y: height - 160,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('TICKET TYPE', {
    x: 320,
    y: height - 160,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('PURCHASER', {
    x: 520,
    y: height - 160,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`PRICE`, {
    x: 720,
    y: height - 160,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Set ticket info
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(ticket.qrCode, {
    x: 120,
    y: height - 190,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(ticketType, {
    x: 320,
    y: height - 190,
    size: regularSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(purchaser, {
    x: 520,
    y: height - 190,
    size: regularSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(ticketPrice, {
    x: 720,
    y: height - 190,
    size: regularSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText('VENUE', {
    x: 120,
    y: height - 250,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('ORGANISER', {
    x: 520,
    y: height - 250,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Set more info
  page.drawText(venue, {
    x: 120,
    y: height - 280,
    size: regularSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(organiser, {
    x: 520,
    y: height - 280,
    size: regularSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Set QR Code
  try {
    const qrCodeImageBytes = await fetch(qrCode).then((res) =>
      res.arrayBuffer()
    );
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);

    // Draw QR Code
    const qrCodeHeight = 180;
    const qrCodeWidth = 180;
    const qrCodeX = (width - qrCodeWidth) / 2;
    const qrCodeY = height - 400;

    page.drawImage(qrCodeImage, {
      x: qrCodeX,
      y: qrCodeY,
      width: qrCodeWidth,
      height: qrCodeHeight,
    });
  } catch (error) {
    console.log(error);
  }

  // Set terms & conditions
  page.drawText('Terms & Conditions:', {
    x: 120,
    y: height - 450,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    'All ticket sales are final. No refunds or exchanges. Valid for entry only in accordance with event rules.',
    {
      x: 120,
      y: height - 470,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    }
  );

  // Set footer message
  page.drawText(
    'This ticket is void if altered, and is a license to enter the specified event, subject to the terms, conditions and rules of the venue and organizer.',
    {
      x: 120,
      y: height - 600,
      size: 10,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    }
  );

  const path_ext = path.join(
    __dirname,
    `../../downloads/${ticket.qr_code}.pdf`
  );
  const pdfBytes = await pdfDoc.save();

  try {
    fs.writeFileSync(path_ext, pdfBytes);
    return {
      pdfName: ticket.nameOnTicket || 'Ticket',
      pdfFileName: path_ext,
    };
  } catch (err) {
    console.log('Error creating PDF:', err);
    return null;
  }
};
