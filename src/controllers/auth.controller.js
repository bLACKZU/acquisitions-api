import logger from '#config/logger.js';

import { signUpSchema } from '#validations/auth.validation.js';   
import { formatValidationErrors } from '#utils/format.js';
import { users } from '#models/user.model.js';
import { createUser } from '#services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signup = async (req, res, next) => {
    try {
        const validationResult = signUpSchema.safeParse(req.body);

        if(!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: formatValidationErrors(validationResult.error)
            });
        }
        const { name, email, password, role } = validationResult.data;

        const user = await createUser({ name, email, password, role });

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);
        logger.info(`User registered successfully: ${email}`);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role, 
            }
        });
    } catch (error) {
        logger.error('Error in signup controller:', error);

        if(error.message === 'User with this email already exists') {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        next(error)
    }
};
