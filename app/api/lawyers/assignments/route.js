import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/lawyers/assignments - Get assignments for the current lawyer
export async function GET(request) {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const profile = await prisma.lawyerProfile.findUnique({ where: { userId: user.userId } });
        if (!profile) return NextResponse.json({ assignments: [] });

        const assignments = await prisma.lawyerAssignment.findMany({
            where: { lawyerId: profile.id },
            include: {
                case: {
                    include: {
                        category: true,
                        user: { select: { id: true, name: true, email: true, state: true, city: true } }
                    }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        return NextResponse.json({ assignments });
    } catch (error) {
        console.error('Get assignments error:', error);
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

// PUT /api/lawyers/assignments - Accept or reject case assignment
export async function PUT(request) {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { assignmentId, action } = await request.json(); // action: ACCEPTED | REJECTED
        if (!assignmentId || !['ACCEPTED', 'REJECTED'].includes(action)) {
            return NextResponse.json({ error: 'assignmentId and valid action required' }, { status: 400 });
        }

        const assignment = await prisma.lawyerAssignment.findUnique({
            where: { id: assignmentId },
            include: { lawyer: true, case: true }
        });

        if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        if (assignment.lawyer.userId !== user.userId) {
            return NextResponse.json({ error: 'Not your assignment' }, { status: 403 });
        }

        const updated = await prisma.lawyerAssignment.update({
            where: { id: assignmentId },
            data: { status: action }
        });

        // Update case status
        if (action === 'ACCEPTED') {
            await prisma.case.update({ where: { id: assignment.caseId }, data: { status: 'IN_PROGRESS' } });
        }

        // Recalculate lawyerMode if rejected
        if (action === 'REJECTED') {
            const remaining = await prisma.lawyerAssignment.findMany({
                where: { caseId: assignment.caseId, status: { in: ['PENDING', 'ACCEPTED'] } }
            });
            const roles = remaining.map(a => a.roleType);
            let lawyerMode = 'SELF';
            if (roles.includes('PRIMARY') && roles.includes('LOCAL')) lawyerMode = 'BOTH';
            else if (roles.includes('PRIMARY')) lawyerMode = 'PRIMARY_ONLY';
            else if (roles.includes('LOCAL')) lawyerMode = 'LOCAL_ONLY';

            await prisma.case.update({ where: { id: assignment.caseId }, data: { lawyerMode } });
        }

        await prisma.timelineEvent.create({
            data: {
                caseId: assignment.caseId,
                createdById: user.userId,
                eventDescription: `Lawyer ${action === 'ACCEPTED' ? 'accepted' : 'rejected'} the case (${assignment.roleType} role)`,
                eventType: 'LAWYER_ASSIGNED'
            }
        });

        return NextResponse.json({ assignment: updated });
    } catch (error) {
        console.error('Assignment update error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
