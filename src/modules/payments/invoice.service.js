import PDFDocument from 'pdfkit';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';

/**
 * Generate a PDF invoice for a specific payment
 */
export const generateInvoicePdf = async (paymentId, userId) => {
  const payment = await prisma.payment.findFirst({
    where: { 
      id: paymentId,
      userId: userId 
    },
    include: { user: true }
  });

  if (!payment) {
    throw new AppError('Payment record not found', 404);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    // --- Header ---
    doc.fillColor('#444444').fontSize(20).text('Dating App Invoice', 110, 57);
    doc.fontSize(10).text('123 Love Street, Cloud City', 200, 65, { align: 'right' });
    doc.text('support@datingapp.com', 200, 80, { align: 'right' });
    doc.moveDown();

    // --- Invoice Info ---
    doc.fillColor('#000000').fontSize(12).text(`Invoice ID: INV-${payment.id.substring(0, 8).toUpperCase()}`, 50, 160);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, 50, 175);
    doc.text(`User: ${payment.user?.firstName || 'Valued Customer'}`, 50, 190);
    doc.moveDown();

    // --- Table Header ---
    const tableTop = 230;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Tier', 200, tableTop);
    doc.text('Status', 350, tableTop);
    doc.text('Total', 500, tableTop);
    doc.font('Helvetica');

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // --- Table Content ---
    const itemTop = tableTop + 30;
    doc.text(`Subscription for ${payment.planType || 'Premium'}`, 50, itemTop);
    doc.text(payment.planType || 'Premium', 200, itemTop);
    doc.text(payment.status, 350, itemTop);
    doc.text(`${payment.currency} ${payment.amount}`, 500, itemTop);

    doc.moveTo(50, itemTop + 15).lineTo(550, itemTop + 15).stroke();

    // --- Footer ---
    doc.fontSize(10).text('Thank you for choosing Dating App!', 50, 700, { align: 'center', width: 500 });

    doc.end();
  });
};

export default {
  generateInvoicePdf,
};
