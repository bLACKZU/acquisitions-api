import logger from '#config/logger.js';
import bcrypt from 'bcrypt';
import { users } from '#models/user.model.js';
import { db } from '#config/database.js';
import { eq } from 'drizzle-orm';

export const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        logger.error('Error hashing password:', error);
        throw new Error('Could not hash password');
    }
};


export const createUser = async ({ name, email, password, role }) => {
    try{
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if(existingUser.length > 0) throw new Error('User with this email already exists');
        const password_hash = await hashPassword(password);

        const [newUser] = await db.insert(users).values({
            name,
            email,
            password: password_hash,
            role
        }).returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });

        logger.info(`User ${newUser.name} created with ID: ${newUser.id}`);
        return newUser;
    } catch (error) {
        logger.error('Error creating user:', error);
        throw error;
    }
};   