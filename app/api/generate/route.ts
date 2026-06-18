import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { runGeneratePipeline } from '@/lib/pipeline';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runGeneratePipeline(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 });
  }
}
