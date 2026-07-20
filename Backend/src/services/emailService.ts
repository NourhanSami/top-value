import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getSmtpConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_name', 'smtp_from_email'] } },
  });
  const map = settings.reduce((acc: Record<string, string>, s) => { acc[s.key] = s.value || ''; return acc; }, {});
  return map;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const cfg = await getSmtpConfig();
  if (!cfg.smtp_host || !cfg.smtp_user) throw new Error('إعدادات SMTP غير مكتملة. يرجى تكوينها في الإعدادات.');
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || '587'),
    secure: parseInt(cfg.smtp_port || '587') === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
  await transporter.sendMail({
    from: `"${cfg.smtp_from_name || 'NewStock'}" <${cfg.smtp_from_email || cfg.smtp_user}>`,
    to,
    subject,
    html,
  });
}

export function invoiceEmailTemplate(sale: any, companyName: string): string {
  const items = (sale.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.product?.name || ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${Number(item.totalAmount).toFixed(2)}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة</title></head>
<body style="font-family:Arial,sans-serif;direction:rtl;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#1a56db;color:#fff;padding:24px">
      <h1 style="margin:0;font-size:24px">${companyName}</h1>
      <p style="margin:4px 0 0;opacity:0.8">فاتورة مبيعات</p>
    </div>
    <div style="padding:24px">
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div><strong>رقم الفاتورة:</strong> ${sale.invoiceNumber}</div>
        <div><strong>التاريخ:</strong> ${new Date(sale.saleDate).toLocaleDateString('ar-EG')}</div>
      </div>
      ${sale.customer ? `<p><strong>العميل:</strong> ${sale.customer.name}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f8f9fa">
            <th style="padding:10px;text-align:right">المنتج</th>
            <th style="padding:10px;text-align:center">الكمية</th>
            <th style="padding:10px;text-align:left">السعر</th>
            <th style="padding:10px;text-align:left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      <div style="text-align:left;border-top:2px solid #1a56db;padding-top:16px">
        <p>المجموع: <strong>${Number(sale.subtotal).toFixed(2)}</strong></p>
        ${Number(sale.taxAmount) > 0 ? `<p>الضريبة: <strong>${Number(sale.taxAmount).toFixed(2)}</strong></p>` : ''}
        ${Number(sale.discountAmount) > 0 ? `<p>الخصم: <strong>-${Number(sale.discountAmount).toFixed(2)}</strong></p>` : ''}
        <h3 style="color:#1a56db">الإجمالي الكلي: ${Number(sale.totalAmount).toFixed(2)}</h3>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;color:#666;font-size:12px">
      شكراً لتعاملكم معنا — ${companyName}
    </div>
  </div>
</body>
</html>`;
}

export function quotationEmailTemplate(quotation: any, companyName: string): string {
  const items = (quotation.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.product?.name || ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${Number(item.totalAmount).toFixed(2)}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>عرض سعر</title></head>
<body style="font-family:Arial,sans-serif;direction:rtl;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#059669;color:#fff;padding:24px">
      <h1 style="margin:0;font-size:24px">${companyName}</h1>
      <p style="margin:4px 0 0;opacity:0.8">عرض أسعار</p>
    </div>
    <div style="padding:24px">
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div><strong>رقم العرض:</strong> ${quotation.quotationNumber}</div>
        <div><strong>التاريخ:</strong> ${new Date(quotation.quotationDate).toLocaleDateString('ar-EG')}</div>
      </div>
      ${quotation.validUntil ? `<p><strong>صالح حتى:</strong> ${new Date(quotation.validUntil).toLocaleDateString('ar-EG')}</p>` : ''}
      ${quotation.customer ? `<p><strong>العميل:</strong> ${quotation.customer.name}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f8f9fa">
            <th style="padding:10px;text-align:right">المنتج</th>
            <th style="padding:10px;text-align:center">الكمية</th>
            <th style="padding:10px;text-align:left">السعر</th>
            <th style="padding:10px;text-align:left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      <div style="text-align:left;border-top:2px solid #059669;padding-top:16px">
        <h3 style="color:#059669">الإجمالي: ${Number(quotation.totalAmount).toFixed(2)}</h3>
      </div>
      ${quotation.notes ? `<p style="color:#666;margin-top:16px"><em>${quotation.notes}</em></p>` : ''}
      ${quotation.terms ? `<div style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:8px"><strong>الشروط والأحكام:</strong><p style="margin:8px 0 0;color:#666">${quotation.terms}</p></div>` : ''}
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;color:#666;font-size:12px">
      للاستفسار والتواصل — ${companyName}
    </div>
  </div>
</body>
</html>`;
}
