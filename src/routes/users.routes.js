import express from 'express';
import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controller.js';

const usersRoute = express.Router();

usersRoute.get('/', fetchAllUsers);
usersRoute.get('/:id', getUserById);
usersRoute.put('/:id', updateUser);
usersRoute.delete('/:id', deleteUser);

export default usersRoute;
