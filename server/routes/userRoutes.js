import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'manager', 'supervisor'), getUsers)
  .post(authorize('admin'), createUser);

router
  .route('/:id')
  .get(authorize('admin', 'manager', 'supervisor'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

export default router;
