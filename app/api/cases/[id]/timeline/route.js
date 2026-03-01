import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/cases/[id]/timeline - Add timeline event
export async function POST(request, { params }) {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    try {
        const { eventDescription, eventType } = await request.json();
        if (!eventDescription) return NextResponse.json({ error: 'Description required' }, { status: 400 });

        const event = await prisma.timelineEvent.create({
            data: {
                caseId: id,
                createdById: user.userId,
                eventDescription,
                eventType: eventType || 'NOTE'
            }
        });

        return NextResponse.json({ event }, { status: 201 });
    } catch (error) {
        console.error('Timeline error:', error);
        return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
    }
}
