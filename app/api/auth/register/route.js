import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, password, role, phone, state, city, specializations, barCouncilId, yearsExperience, bio } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: role || 'CITIZEN', phone, state, city }
        });

        // If registering as a lawyer, create LawyerProfile
        if (role === 'LAWYER') {
            await prisma.lawyerProfile.create({
                data: {
                    userId: user.id,
                    specializations: JSON.stringify(specializations || []),
                    barCouncilId: barCouncilId || '',
                    state: state || '',
                    city: city || '',
                    yearsExperience: yearsExperience || 0,
                    bio: bio || '',
                }
            });
        }

        const token = generateToken(user);
        return NextResponse.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, state: user.state, city: user.city }
        }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
