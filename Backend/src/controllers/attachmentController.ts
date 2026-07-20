import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export const getAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.query;
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = parseInt(entityId as string);
    const attachments = await prisma.attachment.findMany({ where, include: { uploader: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: attachments });
  } catch (error) { next(error); }
};

export const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.body;
    const userId = (req as any).user.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم رفع أي ملف' });
    if (!entityType || !entityId) return res.status(400).json({ success: false, message: 'entityType و entityId مطلوبان' });

    const attachment = await prisma.attachment.create({
      data: {
        entityType,
        entityId: parseInt(entityId),
        fileName: req.file.originalname,
        filePath: `/uploads/attachments/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: userId,
      },
    });
    res.status(201).json({ success: true, message: 'تم رفع الملف بنجاح', data: attachment });
  } catch (error) { next(error); }
};

export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const att = await prisma.attachment.findUnique({ where: { id: parseInt(id) } });
    if (!att) return res.status(404).json({ success: false, message: 'المرفق غير موجود' });
    const filePath = path.join(process.cwd(), 'uploads', 'attachments', path.basename(att.filePath));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.attachment.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'تم حذف المرفق' });
  } catch (error) { next(error); }
};
