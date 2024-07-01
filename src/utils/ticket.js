import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import { fileURLToPath } from 'url';
import { generateQRCode } from '../services/whatasapp/whatsapp.js';
import { getEvent } from './api.js';


export const generateTicket = async (ticket) => {

  const qrCode = await generateQRCode(ticket.qr_code);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const dateTime = moment(ticket.event_start).format(
    'dddd, MMMM Do YYYY, h:mm:ss a'
  );
  const ticketType = ticket.ticket_type;
  const ticketPrice = `USD $${ticket.purchaser.price_paid}`;
  const purchaser = ticket.purchaser.full_name;
  const venue =  ticket.location.name;
  const organiser = 'Zimbabwe Cricket';
  const eventTitle = ticket.title;

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

  page.drawText(ticket.name_on_ticket, {
    x: 120,
    y: height - 180,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(ticketType, {
    x: 320,
    y: height - 180,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(purchaser, {
    x: 520,
    y: height - 180,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(ticketPrice, {
    x: 720,
    y: height - 180,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  // Set venue info
  page.drawText('Venue:', {
    x: 120,
    y: height - 240,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });


  page.drawText(venue, {
    x: 120,
    y: height - 260,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  page.drawText('Organizer', {
    x: 650,
    y: height - 240,
    size: regularSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(organiser, {
    x: 650,
    y: height - 260,
    size: regularSize,
    font: regularFont,
    color: rgb(0, 0, 0),
  });


  page.drawRectangle({
    x: xMargin,
    y: 0,
    width: width - xMargin * 2,
    height: 380,
    color: rgb(0.8, 0.8, 0.8),
    opacity,
  });

  const response = await fetch(qrCode);
  const qrCodeArrayBuffer = await response.arrayBuffer();
  const qrImage = await pdfDoc.embedPng(qrCodeArrayBuffer);


  const qrDims = qrImage.scale(0.5);
  page.drawImage(qrImage, {
    x: 120,
    y: 50,
    width: qrDims.width,
    height: qrDims.height,
  });

  
  page.drawText('Check in for this event', {
    x: 450,
    y: 250,
    size: 32,
    font: titleFont,
    color: rgb(0, 0, 0),
  });

  page.drawText('Scan this QR code at the event to check in', {
    x: 450,
    y: 210,
    size: 24,
    font: regularFont,
    color: rgb(0, 0, 0),
  });

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const pdfFileName = path.join(__dirname, '..', '..', 'downloads', `${purchaser}${ticket.name_on_ticket}.pdf`);
  const pdfName = `${purchaser}${ticket.name_on_ticket}.pdf`;
  fs.writeFileSync(pdfFileName, pdfBytes);
  return { pdfName, pdfFileName };
};
