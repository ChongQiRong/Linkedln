import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const clean = (line: string) => line.replace(/^#{1,6}\s*/, '').replace(/^[-*]\s*/, '• ').trim();
function wrap(text: string, max = 92) {
  const out: string[] = []; let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if ((line + ' ' + word).trim().length > max) { if (line) out.push(line); line = word; } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line); return out.length ? out : [''];
}

export async function POST(request: Request) {
  const { title = 'Document', content = '' } = await request.json();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]); let y = 742;
  const draw = (text: string, size = 10.5, isBold = false) => { if (y < 54) { page = pdf.addPage([612, 792]); y = 742; } page.drawText(text, { x: 54, y, size, font: isBold ? bold : font, color: rgb(0.08, 0.08, 0.08) }); y -= size + 5; };
  draw(title, 16, true); y -= 8;
  for (const raw of String(content).split('\n')) {
    const isHeading = /^#{1,3}\s/.test(raw); const text = clean(raw);
    if (!text) { y -= 6; continue; }
    for (const line of wrap(text, isHeading ? 70 : 92)) draw(line, isHeading ? 12.5 : 10.5, isHeading);
  }
  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${String(title).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf"` } });
}
