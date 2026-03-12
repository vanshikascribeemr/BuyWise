// ============================================================
// PRICE DROP ALERTS API
// ============================================================
// POST — Create a new price alert
// GET  — List all active alerts
// DELETE — Remove an alert by ID

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { productId, targetPrice, email } = await req.json();

    if (!productId || !targetPrice) {
      return NextResponse.json({ error: 'productId and targetPrice are required' }, { status: 400 });
    }

    const alert = await prisma.priceAlert.create({
      data: {
        productId,
        targetPrice: Math.round(targetPrice),
        email: email || null,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    console.error('[Alerts API] Create failed:', error);
    return NextResponse.json({ error: 'Failed to create alert', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { isTriggered: false },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('[Alerts API] List failed:', error);
    return NextResponse.json({ error: 'Failed to list alerts' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    await prisma.priceAlert.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Alerts API] Delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
