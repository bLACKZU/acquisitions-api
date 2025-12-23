import express from 'express';
import { signin, signout, signup } from '#controllers/auth.controller.js';
const authRoute = express.Router();

authRoute.post('/sign-up', signup);
authRoute.post('/sign-in', signin);
authRoute.post('/sign-out', signout);

export default authRoute;
