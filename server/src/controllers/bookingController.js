import Joi from 'joi';
import { Booking } from '../models/Booking.js';

const bookingSchema = Joi.object({
  roomNumber: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
  purpose: Joi.string().allow(''),
  // the booker is always the logged-in user, never taken from the body
  bookedBy: Joi.forbidden()
});

// Both start and end days are reserved, so matching boundary dates conflict too.
async function hasConflict(roomNumber, startDate, endDate, excludeId) {
  const filter = {
    roomNumber,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const conflict = await Booking.findOne(filter);
  return !!conflict;
}

export async function getAllBookings(req, res, next) {
  try {
    const bookings = await Booking.find()
      .populate('bookedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings });
  } catch (err) { next(err); }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate('bookedBy', 'name email');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking });
  } catch (err) { next(err); }
}

export async function createBooking(req, res, next) {
  try {
    const { value, error } = bookingSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    if (await hasConflict(value.roomNumber, value.startDate, value.endDate)) {
      return res.status(409).json({ message: 'Room already booked for that time range' });
    }

    const doc = await Booking.create({ ...value, bookedBy: req.user.id });
    res.status(201).json({ booking: doc });
  } catch (err) { next(err); }
}

export async function updateBooking(req, res, next) {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Booking not found' });
    if (existing.bookedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own bookings' });
    }

    // drop bookedBy from the merge so the owner can't be reassigned
    const { bookedBy, ...current } = existing.toObject();
    const merged = { ...current, ...req.body };
    const { value, error } = bookingSchema.validate(merged, { abortEarly: false, stripUnknown: true, convert: true });
    if (error) return res.status(400).json({ message: error.message });

    if (await hasConflict(value.roomNumber, value.startDate, value.endDate, existing._id)) {
      return res.status(409).json({ message: 'Room already booked for that time range' });
    }

    const doc = await Booking.findByIdAndUpdate(req.params.id, { $set: value }, { new: true, runValidators: true });
    res.json({ booking: doc });
  } catch (err) { next(err); }
}

export async function deleteBooking(req, res, next) {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Booking not found' });
    if (existing.bookedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own bookings' });
    }

    await existing.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
}
