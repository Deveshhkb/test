import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Enquiry from '../models/Enquiry.js';
import Package from '../models/Package.js';
import { asyncHandler } from '../middleware/error.js';

// @route GET /api/admin/stats  (admin) — dashboard summary cards
export const getStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalBookings, totalEnquiries, totalPackages, revenueAgg, recentBookings] =
    await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Enquiry.countDocuments({ status: 'new' }),
      Package.countDocuments(),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(5),
    ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalBookings,
      newEnquiries: totalEnquiries,
      totalPackages,
      revenue: revenueAgg[0]?.total || 0,
      recentBookings,
    },
  });
});

// @route GET /api/admin/users  (admin)
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
});

// @route PUT /api/admin/users/:id  (admin) — change role / details
export const updateUser = asyncHandler(async (req, res) => {
  const { role, name, mobile } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (role) user.role = role;
  if (name) user.name = name;
  if (mobile) user.mobile = mobile;
  await user.save();
  res.json({ success: true, data: user });
});

// @route DELETE /api/admin/users/:id  (admin)
export const deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});
