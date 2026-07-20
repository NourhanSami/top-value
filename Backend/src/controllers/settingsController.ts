import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import path from 'path';
import fs from 'fs';

export const getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSetting.findMany({ orderBy: { group: 'asc' } });
    const grouped = settings.reduce((acc: Record<string, any[]>, s) => {
      if (!acc[s.group]) acc[s.group] = [];
      acc[s.group].push(s);
      return acc;
    }, {});
    res.json({ success: true, data: settings, grouped });
  } catch (error) { next(error); }
};

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSetting.findMany({ where: { isPublic: true } });
    const map = settings.reduce((acc: Record<string, string | null>, s) => { acc[s.key] = s.value; return acc; }, {});
    res.json({ success: true, data: settings, map });
  } catch (error) { next(error); }
};

export const updateSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: 'general', isPublic: false },
    });
    res.json({ success: true, message: 'تم حفظ الإعداد', data: setting });
  } catch (error) { next(error); }
};

export const updateManySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body as { settings: { key: string; value: string }[] };
    if (!Array.isArray(settings)) return res.status(400).json({ success: false, message: 'settings يجب أن تكون مصفوفة' });
    const results = await Promise.all(
      settings.map(({ key, value }) =>
        prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value, group: 'general', isPublic: false } })
      )
    );
    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح', data: results });
  } catch (error) { next(error); }
};

export const downloadBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
    let dbPath = dbUrl.replace(/^file:/, '');
    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(process.cwd(), dbPath);
    }
    const candidates = [
      dbPath,
      path.resolve(process.cwd(), 'prisma', 'dev.db'),
      path.resolve(process.cwd(), 'dev.db'),
    ];
    const file = candidates.find((p) => fs.existsSync(p));
    if (!file) {
      return res.status(404).json({ success: false, message: 'ملف قاعدة البيانات غير موجود' });
    }
    res.download(file, `backup-${new Date().toISOString().slice(0, 10)}.db`);
  } catch (error) {
    next(error);
  }
};
