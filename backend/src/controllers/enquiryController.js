import Enquiry from '../models/Enquiry.js';
import { asyncHandler } from '../middleware/error.js';
import { sendMail, enquiryEmailHtml } from '../utils/mailer.js';

// @route POST /api/enquiries  (public)
export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.create(req.body);

  // Email the enquiry details to the admin inbox. Non-blocking: a mail failure
  // must not stop the enquiry from being accepted.
  const to = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  if (to) {
    sendMail({
      to,
      subject: `New Enquiry: ${enquiry.subject || 'General'} — ${enquiry.name}`,
      replyTo: enquiry.email,
      html: enquiryEmailHtml(enquiry),
    }).catch((err) => console.error('✖ Enquiry email failed:', err.message));
  }

  res.status(201).json({ success: true, message: 'Thank you! Our team will contact you shortly.', data: enquiry });
});

// @route GET /api/enquiries  (admin)
export const listEnquiries = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const enquiries = await Enquiry.find(query).populate('relatedPackage', 'title').sort({ createdAt: -1 });
  res.json({ success: true, count: enquiries.length, data: enquiries });
});

// @route PUT /api/enquiries/:id  (admin)
export const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }
  res.json({ success: true, data: enquiry });
});

// @route DELETE /api/enquiries/:id  (admin)
export const deleteEnquiry = asyncHandler(async (req, res) => {
  await Enquiry.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});
