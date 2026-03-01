import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/categories - List all legal categories
export async function GET() {
    try {
        const categories = await prisma.legalCategory.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ categories });
    } catch (error) {
        console.error('Categories error:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}
