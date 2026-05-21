import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types';

const router = Router();

// Register
router.post('/register', async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
    try {
        const { email, name, password } = req.body;

        // Check if user exists
        const existingUsers = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUsers.length > 0) {
            console.log('User already exists:', existingUsers[0].email);
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        let newUser;
        try {
            console.log('Attempting to insert user:', email);
            [newUser] = await db.insert(users).values({
                email,
                name,
                passwordHash,
            }).returning();
            console.log('User created successfully:', newUser?.id, newUser?.email);
        } catch (insertError: any) {
            console.error('Insert error:', insertError);
            // Handle unique constraint violation (email already exists)
            if (insertError?.code === '23505' || insertError?.message?.includes('unique') || insertError?.message?.includes('duplicate')) {
                console.error('User already exists (unique constraint):', email);
                return res.status(400).json({ error: 'User already exists' });
            }
            throw insertError;
        }

        // Verify user was actually created
        if (!newUser) {
            console.error('User creation returned no user object!');
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: newUser.id },
            process.env.JWT_SECRET!,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
        );

        const response: AuthResponse = {
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
            },
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login
router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user
        const userResults = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        const user = userResults[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET!,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
        );

        const response: AuthResponse = {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };

        res.json(response);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

export default router;
