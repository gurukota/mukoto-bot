import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import fetch from 'node-fetch';
import { createTicket } from './api.js';
import { generateQRCode } from '../services/whatasapp/whatsapp.js';
import { setSession } from '../config/session.js';

export const generateTicket = async(session, userId) => {
    let pdfList = [];
    for(let i = 0; i < session.quantity; i++) {
        const qrCodeText = uuidv4();
        const randomString = Math.random().toString(36).substring(2,7);
        const qrCode = await generateQRCode(qrCodeText);
        const ticketData = {
            event_id: session.event.id,
            name_on_ticket: `${userId.name}_${randomString}`,
            checked_in: false,
            qr_code: qrCodeText,
            qr_code_url: qrCode, // Set the URL of the QR code image if applicable
            ticket_type_id: session.ticketTypes[0].ticket_type_id, // Set the ticket type ID if applicable
            status: 'paid', // Set the status of     the ticket if applicable
            full_name: userId.name, // Set the full name of the ticket holder
            price_paid: session.ticketTypes[0].price, // Set the price paid for the ticket if applicable
            total_quantity: session.quantity,// Set the total quantity of tickets if applicable
            email: "purchases@mukoto.co.zw",
            phone: userId.phone, // Set the phone number of the ticket holder
            currency_code: session.ticketTypes[0].currency_code,
            payment_status:"paid",

        };
        await createTicket(ticketData, session.event.id);

        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

        // Add a blank page to the document
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // Add event details to the PDF
        const fontSize = 18;
        const textWidth = timesRomanFont.widthOfTextAtSize('Event Ticket', fontSize);
        page.drawText('Event Ticket', {
            x: (width - textWidth) / 2,
            y: height - 4 * fontSize,
            size: fontSize,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
        });

        //add png to document 
        const res = await fetch(session.event.image);
        const eventTemplateArrayBuffer = await res.arrayBuffer();
        const eventTemplateImage = await pdfDoc.embedJpg(eventTemplateArrayBuffer);
        page.drawImage(eventTemplateImage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
        });

        // Add QR code to the PDF
        const response = await fetch(qrCode);
        const qrCodeArrayBuffer = await response.arrayBuffer();
        const qrCodeImage = await pdfDoc.embedPng(qrCodeArrayBuffer);
        page.drawImage(qrCodeImage, {
            x: 0,
            y: height - 200,
            width: 200,
            height: 200,
        });

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const pdfFileName = `./downloads/${userId.name}_${randomString}.pdf`;
        pdfList.push(`${userId.name}_${randomString}`);
        fs.writeFileSync(pdfFileName, pdfBytes);
    }

    setSession(userId, {pdfList});
}