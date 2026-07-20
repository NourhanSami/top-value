import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail, invoiceEmailTemplate, quotationEmailTemplate } from '../services/emailService';

const prisma = new PrismaClient();

async function getCompanyName(): Promise<string> {
  const s = await prisma.systemSetting.findUnique({ where: { key: 'company_name' } });
  return s?.value || 'NewStock';
}

export const sendInvoiceEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { saleId, email } = req.body;
    if (!saleId || !email) return res.status(400).json({ success: false, message: 'saleId و email مطلوبان' });
    const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { customer: true, items: { include: { product: true } } } });
    if (!sale) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    const companyName = await getCompanyName();
    await sendEmail(email, `فاتورة رقم ${sale.invoiceNumber} — ${companyName}`, invoiceEmailTemplate(sale, companyName));
    res.json({ success: true, message: 'تم إرسال الفاتورة بالبريد الإلكتروني بنجاح' });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const sendQuotationEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quotationId, email } = req.body;
    if (!quotationId || !email) return res.status(400).json({ success: false, message: 'quotationId و email مطلوبان' });
    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId }, include: { customer: true, items: { include: { product: true } } } });
    if (!quotation) return res.status(404).json({ success: false, message: 'عرض السعر غير موجود' });
    const companyName = await getCompanyName();
    await sendEmail(email, `عرض سعر رقم ${quotation.quotationNumber} — ${companyName}`, quotationEmailTemplate(quotation, companyName));
    // Update quotation status to 'sent'
    await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'sent' } });
    res.json({ success: true, message: 'تم إرسال عرض السعر بالبريد الإلكتروني بنجاح' });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};
