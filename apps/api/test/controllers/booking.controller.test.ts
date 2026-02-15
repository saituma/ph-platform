jest.mock("../../src/services/booking.service", () => ({
  createAvailabilityBlock: jest.fn(),
  createBooking: jest.fn(),
  createServiceType: jest.fn(),
  listAvailabilityBlocks: jest.fn(),
  listBookingsForUser: jest.fn(),
  listServiceTypes: jest.fn(),
}));

jest.mock("../../src/services/user.service", () => ({
  getGuardianAndAthlete: jest.fn(),
}));

import { listServices, createBookingForUser, listBookings } from "../../src/controllers/booking.controller";
import { listServiceTypes, createBooking, listBookingsForUser } from "../../src/services/booking.service";
import { getGuardianAndAthlete } from "../../src/services/user.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("booking controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists services", async () => {
    (listServiceTypes as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const res = createRes();

    await listServices({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 1 }] });
  });

  it("returns 400 when onboarding incomplete on booking", async () => {
    (getGuardianAndAthlete as jest.Mock).mockResolvedValue({ guardian: null, athlete: null });
    const req = {
      user: { id: 1 },
      body: { serviceTypeId: 1, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() },
    } as any;
    const res = createRes();

    await createBookingForUser(req, res);

    expect(createBooking).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Onboarding incomplete" });
  });

  it("lists bookings for guardian", async () => {
    (getGuardianAndAthlete as jest.Mock).mockResolvedValue({ guardian: { id: 7 } });
    (listBookingsForUser as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 1 } } as any;
    const res = createRes();

    await listBookings(req, res);

    expect(listBookingsForUser).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 1 }] });
  });
});
