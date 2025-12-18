// src/backend/reports/revenue.report.ts
import ExcelJS from 'exceljs';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import { app } from 'electron';
import docx from 'docx';
import path from 'path';
import pool from "../db/db";

// Экспорт в Excel
export async function exportRevenueToExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Выручка по месяцам');

    // Заголовки
    worksheet.columns = [
        { header: 'Месяц', key: 'month', width: 15 },
        { header: 'Выручка (₽)', key: 'revenue', width: 20 },
        { header: 'Кол-во заказов', key: 'count', width: 15 }
    ];

    // Данные из БД
    const result = await pool.query(`
    SELECT 
      TO_CHAR(o."createdAt", 'YYYY-MM') as month,
      SUM(o.price) as revenue,
      COUNT(*) as count
    FROM "Orders" o
    WHERE o.status = 'delivered' AND o.price IS NOT NULL
    GROUP BY TO_CHAR(o."createdAt", 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `);

    worksheet.addRows(result.rows);

    // Сохранение
    const filePath = path.join(app.getPath('downloads'), `Выручка_${new Date().toISOString().slice(0, 10)}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
}

// Экспорт в Word
export async function exportRevenueToWord() {
    const result = await pool.query(`
    SELECT 
      TO_CHAR(o."createdAt", 'Month YYYY') as month,
      SUM(o.price) as revenue,
      COUNT(*) as count
    FROM "Orders" o
    WHERE o.status = 'delivered' AND o.price IS NOT NULL
    GROUP BY TO_CHAR(o."createdAt", 'YYYY-MM'), TO_CHAR(o."createdAt", 'Month YYYY')
    ORDER BY TO_CHAR(o."createdAt", 'YYYY-MM') DESC
    LIMIT 12
  `);

    const rows = result.rows.map(row => new TableRow({
        children: [
            new TableCell({ children: [new Paragraph(row.month)] }),
            new TableCell({ children: [new Paragraph(`${Number(row.revenue).toFixed(2)} ₽`)] }),
            new TableCell({ children: [new Paragraph(String(row.count))] })
        ]
    }));

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [new TextRun({ text: 'Отчёт по выручке', bold: true, size: 28 })],
                    spacing: { after: 300 }
                }),
                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Месяц')] }),
                                new TableCell({ children: [new Paragraph('Выручка')] }),
                                new TableCell({ children: [new Paragraph('Заказы')] })
                            ]
                        }),
                        ...rows
                    ]
                })
            ]
        }]
    });

    const filePath = path.join(app.getPath('downloads'), `Выручка_${new Date().toISOString().slice(0, 10)}.docx`);
    const buffer = await docx.Packer.toBuffer(doc);
    await require('fs').promises.writeFile(filePath, buffer);
    return filePath;
}