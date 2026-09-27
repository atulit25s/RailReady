import { User } from '../models/User.js';
import { logAction } from '../services/auditService.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin / Manager)
export const getUsers = async (req, res, next) => {
  try {
    const { role, shed, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (shed) query.shed = new RegExp(shed, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin / Manager)
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, shed, phone } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'technician',
      shed: shed || 'Central Locomotive Shed - Kalyan (ELS)',
      phone
    });

    await logAction({
      user: req.user._id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      description: `Created new user ${user.name} with role ${user.role}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shed: user.shed,
        phone: user.phone,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { name, role, shed, phone, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (shed) user.shed = shed;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    await logAction({
      user: req.user._id,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      description: `Updated user profile/role for ${user.name}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent deleting self
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own active account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAction({
      user: req.user._id,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: req.params.id,
      description: `Deleted user ${user.name} (${user.email})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'User removed' });
  } catch (err) {
    next(err);
  }
};
