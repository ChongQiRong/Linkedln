import { NextResponse } from 'next/server';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

function para(raw: string) {
  const heading = raw.match(/^(#{1,3})\s+(.*)/);
  if (heading) return new Paragraph({ text: heading[2], heading: heading[1].length === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, spacing: { after: 120 } });
  const bullet = raw.match(/^[-*]\s+(.*)/);
  if (bullet) return new Paragraph({ children: [new TextRun(bullet[1])], bullet: { level: 0 }, spacing: { after: 80 } });
  return new Paragraph({ children: [new TextRun(raw)], spacing: { after: raw.trim() ? 100 : 160 } });
}

export async function POST(request: Request) {
  const { title = 'Document', content = '' } = await request.json();
  const doc = new Document({ sections: [{ properties: {}, children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 240 } }), ...String(content).split('\n').map(para)] }] });
  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'content-disposition': `attachment; filename="${String(title).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx"` } });
}
