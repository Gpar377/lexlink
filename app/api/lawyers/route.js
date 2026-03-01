import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/lawyers - Search lawyers
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const specialization = searchParams.get('specialization');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    try {
        const where = { verified: true };
        if (state) where.state = state;
        if (specialization) where.specializations = { contains: specialization };

        const [lawyers, total] = await Promise.all([
            prisma.lawyerProfile.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true, state: true, city: true } },
                    _count: { select: { assignments: true } }
                },
                orderBy: { rating: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.lawyerProfile.count({ where })
        ]);

        return NextResponse.json({ lawyers, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Lawyer search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
