import { z } from 'zod';
import { checkReservationAvailability } from '../../services/availabilityService.js';
import type { RegisteredTool } from '../toolRegistry.js';
import type { AvailabilityArtifact } from '../types.js';

const availabilitySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:mm'),
    guests: z.number().int().min(1).max(100),
  })
  .strict();

export const createAvailabilityTool = (options: {
  timeZone: string;
  maxPartySize: number;
}): RegisteredTool<z.infer<typeof availabilitySchema>> => ({
  name: 'check_reservation_availability',
  description:
    'Check stored table availability for a date, time, and party size. Reports only what the backend can substantiate; capacity and opening hours are not stored. Use the restaurant time zone when resolving "today"/"tomorrow".',
  access: 'public',
  schema: availabilitySchema,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      date: { type: 'string', description: 'Requested date in YYYY-MM-DD.' },
      time: { type: 'string', description: 'Requested local time in 24-hour HH:mm.' },
      guests: { type: 'integer', minimum: 1, description: 'Party size.' },
    },
    required: ['date', 'time', 'guests'],
  },
  async handler(args) {
    const result = await checkReservationAvailability(args, {
      timeZone: options.timeZone,
      maxPartySize: options.maxPartySize,
    });
    const data: AvailabilityArtifact = {
      available: result.available,
      date: result.date,
      time: result.time,
      guests: result.guests,
      timeZone: result.timeZone,
      freeTables: result.freeTables,
      tableCount: result.tableCount,
      capacityVerified: result.capacityVerified,
      openingHoursVerified: result.openingHoursVerified,
      notes: result.notes,
    };
    return { ok: true, data };
  },
});
