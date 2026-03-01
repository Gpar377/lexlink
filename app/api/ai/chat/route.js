import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { classifyIssue, generateInitialGuidance, generateFollowUp } from '@/lib/ai-engine';
import { NextResponse } from 'next/server';

// POST /api/ai/chat - AI Chat for a case
export async function POST(request) {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { caseId, message } = await request.json();
        if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

        // Save user message
        if (caseId) {
            await prisma.caseMessage.create({
                data: {
                    caseId,
                    senderId: user.userId,
                    senderRole: user.role,
                    senderName: user.name,
                    content: message,
                    messageType: 'QUESTION'
                }
            });
        }

        let aiResponse;
        let detectedCategory = null;

        if (caseId) {
            // Case-bound chat: get category from case
            const caseData = await prisma.case.findUnique({
                where: { id: caseId },
                include: { category: true }
            });

            if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

            // Check if this is the first AI message for this case
            const prevAiMessages = await prisma.caseMessage.count({
                where: { caseId, senderRole: 'AI' }
            });

            if (prevAiMessages === 0) {
                aiResponse = generateInitialGuidance(
                    caseData.category.name,
                    message,
                    caseData.category.proceduralSteps,
                    caseData.category.documentChecklist
                );
            } else {
                aiResponse = generateFollowUp(caseData.category.name, message);
            }

            // Save AI response
            await prisma.caseMessage.create({
                data: {
                    caseId,
                    senderRole: 'AI',
                    senderName: 'LexLink AI',
                    content: aiResponse,
                    messageType: 'GUIDANCE'
                }
            });

            // Log to timeline
            await prisma.timelineEvent.create({
                data: {
                    caseId,
                    eventDescription: 'AI provided guidance to user',
                    eventType: 'AI_GUIDANCE'
                }
            });
        } else {
            // Intake chat (no case yet) - classify and guide
            detectedCategory = classifyIssue(message);
            if (detectedCategory) {
                const category = await prisma.legalCategory.findUnique({ where: { name: detectedCategory } });
                if (category) {
                    aiResponse = generateInitialGuidance(
                        category.name, message, category.proceduralSteps, category.documentChecklist
                    );
                }
            }

            if (!aiResponse) {
                aiResponse = `I'd like to help you navigate your legal situation. Could you describe your issue in more detail? For example:\n\n` +
                    `- What happened?\n- Where did it happen?\n- When did it happen?\n- Are there any immediate concerns?\n\n` +
                    `This will help me identify the right procedures and guidance for you.\n\n` +
                    `⚠️ *This is general information, not legal advice.*`;
            }
        }

        return NextResponse.json({
            response: aiResponse,
            detectedCategory,
        });
    } catch (error) {
        console.error('AI chat error:', error);
        return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
    }
}
