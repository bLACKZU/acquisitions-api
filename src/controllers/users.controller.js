import logger from '#config/logger.js';
import { formatValidationErrors } from '#utils/format.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/users.service.js';
import {
  updateUserSchema,
  userIdSchema,
} from '#validations/users.validation.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Fetching all users');

    const allUsers = await getAllUsers();

    res.json({
      message: 'Users fetched successfully',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    logger.error('Error in fetchAllUsers controller:', error);
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse({ id: req.params.id });

    if (!validationResult.success) {
      logger.warn('Validation failed for getUserById', {
        params: req.params,
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info('Fetching user by id', { id });

    const user = await getUserByIdService(id);

    res.json({
      message: 'User fetched successfully',
      user,
    });
  } catch (error) {
    logger.error('Error in getUserById controller:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const idValidation = userIdSchema.safeParse({ id: req.params.id });

    if (!idValidation.success) {
      logger.warn('Validation failed for updateUser (id)', {
        params: req.params,
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationErrors(idValidation.error),
      });
    }

    const bodyValidation = updateUserSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      logger.warn('Validation failed for updateUser (body)', {
        body: req.body,
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationErrors(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    const currentUser = req.user;

    if (!currentUser) {
      logger.warn('Unauthorized update attempt', { targetUserId: id });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Non-admin users can only update their own user record.
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      logger.warn('Forbidden update attempt by non-admin user', {
        targetUserId: id,
        userId: currentUser.id,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Only admin can change the role field.
    if (updates.role !== undefined && currentUser.role !== 'admin') {
      logger.warn('Non-admin attempted to change role', {
        targetUserId: id,
        userId: currentUser.id,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admin users can change roles',
      });
    }

    logger.info('Updating user', {
      targetUserId: id,
      userId: currentUser.id,
      roleChange: updates.role !== undefined,
    });

    const updatedUser = await updateUserService(id, updates);

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error in updateUser controller:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse({ id: req.params.id });

    if (!validationResult.success) {
      logger.warn('Validation failed for deleteUser', {
        params: req.params,
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    const currentUser = req.user;

    if (!currentUser) {
      logger.warn('Unauthorized delete attempt', { targetUserId: id });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Non-admin users can only delete their own user record.
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      logger.warn('Forbidden delete attempt by non-admin user', {
        targetUserId: id,
        userId: currentUser.id,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    logger.info('Deleting user', {
      targetUserId: id,
      userId: currentUser.id,
    });

    await deleteUserService(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteUser controller:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(error);
  }
};
