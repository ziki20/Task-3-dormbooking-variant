import assert from 'node:assert/strict';
import test from 'node:test';
import { Booking } from '../models/Booking.js';
import { updateBooking } from './bookingController.js';

test('editing rejects shared booked days and excludes the booking itself', async () => {
  const original = {
    findById: Booking.findById,
    findOne: Booking.findOne,
    findByIdAndUpdate: Booking.findByIdAndUpdate
  };
  const date = day => new Date(`2026-10-${day}T00:00:00.000Z`);
  const current = {
    _id: 'current', bookedBy: 'owner', roomNumber: 'B2-104',
    startDate: date('01'), endDate: date('03'), purpose: ''
  };
  const other = {
    _id: 'other', roomNumber: 'B2-104', startDate: date('10'), endDate: date('12')
  };
  let writes = 0;
  try {
    Booking.findById = async () => ({ ...current, toObject: () => ({ ...current }) });
    Booking.findOne = async filter => [current, other].find(booking =>
      booking._id !== filter._id.$ne &&
      booking.roomNumber === filter.roomNumber &&
      booking.startDate <= filter.startDate.$lte &&
      booking.endDate >= filter.endDate.$gte
    );
    Booking.findByIdAndUpdate = async (_id, update) => {
      writes++;
      return { ...current, ...update.$set };
    };

    const cases = [
      ['08', '10', 409], // Ends on another booking's start day.
      ['12', '14', 409], // Starts on another booking's end day.
      ['09', '11', 409], // Overlaps within the reserved range.
      ['01', '03', 200], // Keeping its own dates is allowed.
      ['13', '15', 200] // Starts after all reserved days.
    ];
    for (const [start, end, expected] of cases) {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
      };
      await updateBooking({
        params: { id: 'current' }, user: { id: 'owner' },
        body: { roomNumber: 'B2-104', startDate: date(start), endDate: date(end), purpose: '' }
      }, res, err => { throw err; });
      assert.equal(res.statusCode, expected, `${start} through ${end}`);
      if (expected === 409) assert.match(res.body.message, /already booked/);
    }
    assert.equal(writes, 2, 'conflicting edits must never be saved');
  } finally {
    Object.assign(Booking, original);
  }
});
