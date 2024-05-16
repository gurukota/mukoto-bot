import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import fs from 'fs';

async function generateTicket(event, userId) {
    const ticketData = {
        eventId: event.id,
        eventName: event.name.text,
        eventDate: event.start.local,
        userId: userId,
    };

    // Generate QR code with ticket data
    const qrCodeText = JSON.stringify(ticketData);
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeText);

    // Create PDF document
    const doc = new PDFDocument();
    const pdfFileName = `ticket_${event.id}_${userId}.pdf`;
    doc.pipe(fs.createWriteStream(pdfFileName));

    // Add event details to the PDF
    doc.fontSize(18).text('Event Ticket', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Event: ${event.name.text}`);
    doc.fontSize(12).text(`Date: ${event.start.local}`);
    doc.moveDown();

    // Add QR code to the PDF
    doc.image(qrCodeBuffer, { fit: [200, 200], align: 'center' });

    // Finalize PDF
    doc.end();

    return pdfFileName;
}

export { generateTicket };
