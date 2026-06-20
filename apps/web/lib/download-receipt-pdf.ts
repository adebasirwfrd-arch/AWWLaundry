import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture a receipt DOM node and download it as a PDF file.
 */
export async function downloadReceiptPdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = 90; // mm — readable receipt width
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
