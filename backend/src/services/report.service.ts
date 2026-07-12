import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import path from 'path';

export interface ReportData {
  title: string;
  subtitle?: string;
  headers: string[];
  keys: string[]; // object keys corresponding to columns
  rows: any[]; // data array
  totals?: Record<string, number | string>; // optional total values for bottom row
}

export class ReportService {
  /**
   * Generates a beautifully formatted PDF report for Swaraj Pvt. Limited
   */
  public static async generatePDF(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- Brand Header ---
        doc.fillColor('#0b192c') // Deep Navy Blue
           .rect(0, 0, 595.28, 90)
           .fill();

        try {
          const logoPath = path.join(__dirname, '../../logo.jpg');
          doc.image(logoPath, 40, 15, { height: 60 });

          doc.fillColor('#ffffff')
             .font('Helvetica-Bold')
             .fontSize(20)
             .text('Swaraj Pvt. Limited', 170, 20);

          doc.font('Helvetica')
             .fontSize(9)
             .fillColor('#94a3b8')
             .text('Finance • Chits • Loans • LIC Services', 170, 48);
        } catch (imgErr) {
          doc.fillColor('#ffffff')
             .font('Helvetica-Bold')
             .fontSize(22)
             .text('Swaraj Pvt. Limited', 40, 20);

          doc.font('Helvetica')
             .fontSize(10)
             .fillColor('#94a3b8')
             .text('Finance • Chits • Loans • LIC Services', 40, 48);
        }

        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor('#ffffff')
           .text('OFFICIAL SYSTEM REPORT', 420, 25, { align: 'right', width: 135 });
        
        doc.font('Helvetica')
           .fontSize(8)
           .text(`Date: ${new Date().toLocaleDateString()}`, 420, 40, { align: 'right', width: 135 });

        // --- Report Title & Subtitle ---
        doc.fillColor('#1f2937')
           .font('Helvetica-Bold')
           .fontSize(16)
           .text(data.title, 40, 110);

        if (data.subtitle) {
          doc.font('Helvetica-Oblique')
             .fontSize(10)
             .fillColor('#4b5563')
             .text(data.subtitle, 40, 130);
        }

        // --- Table Rendering Logic ---
        const startY = 160;
        const tableWidth = 515;
        const colWidth = tableWidth / data.headers.length;
        
        // Draw Header
        doc.fillColor('#1e3a8a') // Royal Blue Header
           .rect(40, startY, tableWidth, 24)
           .fill();

        doc.fillColor('#ffffff')
           .font('Helvetica-Bold')
           .fontSize(9);

        let currentX = 40;
        data.headers.forEach((header) => {
          doc.text(header, currentX + 6, startY + 8, { width: colWidth - 12, ellipsis: true });
          currentX += colWidth;
        });

        // Draw Rows
        let currentY = startY + 24;
        doc.font('Helvetica').fontSize(8).fillColor('#1f2937');

        data.rows.forEach((row, index) => {
          // Check for page overflow
          if (currentY > 750) {
            doc.addPage();
            currentY = 40;
            // Redraw Header on new page
            doc.fillColor('#1e3a8a')
               .rect(40, currentY, tableWidth, 24)
               .fill();
            doc.fillColor('#ffffff')
               .font('Helvetica-Bold')
               .fontSize(9);
            
            let tempX = 40;
            data.headers.forEach((header) => {
              doc.text(header, tempX + 6, currentY + 8, { width: colWidth - 12, ellipsis: true });
              tempX += colWidth;
            });
            currentY += 24;
            doc.font('Helvetica').fontSize(8).fillColor('#1f2937');
          }

          // Shading for alternating rows
          if (index % 2 === 1) {
            doc.fillColor('#f9fafb')
               .rect(40, currentY, tableWidth, 20)
               .fill();
          }

          // Border line
          doc.strokeColor('#e5e7eb')
             .lineWidth(0.5)
             .moveTo(40, currentY + 20)
             .lineTo(40 + tableWidth, currentY + 20)
             .stroke();

          // Write cells
          doc.fillColor('#1f2937');
          let cellX = 40;
          data.keys.forEach((key) => {
            const rawVal = row[key];
            let valStr = '';
            if (rawVal instanceof Date) {
              valStr = rawVal.toLocaleDateString();
            } else if (typeof rawVal === 'number') {
              valStr = rawVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
              valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '-';
            }
            doc.text(valStr, cellX + 6, currentY + 6, { width: colWidth - 12, ellipsis: true });
            cellX += colWidth;
          });

          currentY += 20;
        });

        // Draw Totals if provided
        if (data.totals) {
          doc.fillColor('#f1f5f9')
             .rect(40, currentY, tableWidth, 22)
             .fill();

          doc.strokeColor('#94a3b8')
             .lineWidth(1)
             .moveTo(40, currentY)
             .lineTo(40 + tableWidth, currentY)
             .moveTo(40, currentY + 22)
             .lineTo(40 + tableWidth, currentY + 22)
             .stroke();

          doc.fillColor('#0f172a').font('Helvetica-Bold');
          let totalX = 40;
          data.keys.forEach((key, index) => {
            // If first cell, default to 'TOTAL' if not specified
            let text = '';
            if (index === 0 && !data.totals?.[key]) {
              text = 'TOTAL';
            } else if (data.totals?.[key] !== undefined) {
              const val = data.totals[key];
              text = typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(val);
            }
            doc.text(text, totalX + 6, currentY + 7, { width: colWidth - 12, ellipsis: true });
            totalX += colWidth;
          });
          currentY += 22;
        }

        // --- Footer signatures & disclaimer ---
        currentY += 40;
        if (currentY < 750) {
          doc.strokeColor('#cbd5e1')
             .lineWidth(1)
             .moveTo(40, currentY + 30)
             .lineTo(160, currentY + 30)
             .moveTo(435, currentY + 30)
             .lineTo(555, currentY + 30)
             .stroke();

          doc.fillColor('#6b7280')
             .font('Helvetica')
             .fontSize(8)
             .text('Prepared By System', 40, currentY + 35, { width: 120, align: 'center' })
             .text('Authorized Signatory', 435, currentY + 35, { width: 120, align: 'center' });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a beautifully styled Excel spreadsheet workbook using exceljs
   */
  public static async generateExcel(data: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Swaraj FinancePro AI';
    
    const worksheet = workbook.addWorksheet('Report');

    // Title Row
    worksheet.mergeCells('A1', 'E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Swaraj Pvt. Limited - FinancePro AI Platform';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B192C' } }; // Deep Navy
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Subtitle Row
    worksheet.mergeCells('A2', 'E2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `${data.title} ${data.subtitle ? `(${data.subtitle})` : ''} - Generated ${new Date().toLocaleDateString()}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subtitleCell.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Header Row
    const headerRow = worksheet.getRow(4);
    headerRow.values = data.headers;
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    
    data.headers.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8B' } }; // Royal Blue
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });
    headerRow.height = 25;

    // Data Rows
    data.rows.forEach((rowObj) => {
      const vals = data.keys.map((key) => {
        const val = rowObj[key];
        if (val instanceof Date) {
          return val.toLocaleDateString();
        }
        return val !== undefined && val !== null ? val : '';
      });
      worksheet.addRow(vals);
    });

    // Totals Row
    if (data.totals) {
      const totalVals = data.keys.map((key, index) => {
        if (index === 0 && !data.totals?.[key]) {
          return 'TOTAL';
        }
        return data.totals?.[key] !== undefined ? data.totals[key] : '';
      });
      const addedTotalRow = worksheet.addRow(totalVals);
      addedTotalRow.font = { name: 'Arial', size: 11, bold: true };
      
      data.keys.forEach((_, i) => {
        const cell = addedTotalRow.getCell(i + 1);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF475569' } }
        };
      });
    }

    // Auto-fit Columns
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : '';
        if (cellValue.length > maxLen) {
          maxLen = cellValue.length;
        }
      });
      column.width = Math.max(12, maxLen + 3);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates a raw CSV text content
   */
  public static generateCSV(data: ReportData): string {
    const csvRows: string[] = [];
    
    // Header
    csvRows.push(data.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    // Rows
    data.rows.forEach((rowObj) => {
      const vals = data.keys.map((key) => {
        const val = rowObj[key];
        let valStr = '';
        if (val instanceof Date) {
          valStr = val.toLocaleDateString();
        } else if (val !== undefined && val !== null) {
          valStr = String(val);
        }
        return `"${valStr.replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    });

    // Totals
    if (data.totals) {
      const totalVals = data.keys.map((key, index) => {
        let valStr = '';
        if (index === 0 && !data.totals?.[key]) {
          valStr = 'TOTAL';
        } else if (data.totals?.[key] !== undefined) {
          valStr = String(data.totals[key]);
        }
        return `"${valStr.replace(/"/g, '""')}"`;
      });
      csvRows.push(totalVals.join(','));
    }

    return csvRows.join('\n');
  }
}
