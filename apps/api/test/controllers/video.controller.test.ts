jest.mock("../../src/services/s3.service", () => ({
  getPresignedUploadUrl: jest.fn(),
}));

jest.mock("../../src/services/video.service", () => ({
  createVideoUpload: jest.fn(),
  listVideoUploadsByAthlete: jest.fn(),
  reviewVideoUpload: jest.fn(),
}));

jest.mock("../../src/services/user.service", () => ({
  getAthleteForUser: jest.fn(),
}));

import { createUploadUrl, createVideo, listVideos, reviewVideo } from "../../src/controllers/video.controller";
import { getPresignedUploadUrl } from "../../src/services/s3.service";
import { createVideoUpload, listVideoUploadsByAthlete, reviewVideoUpload } from "../../src/services/video.service";
import { getAthleteForUser } from "../../src/services/user.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("video controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates presigned upload url", async () => {
    (getPresignedUploadUrl as jest.Mock).mockResolvedValue("https://s3.test/upload");
    const req = { body: { key: "videos/1.mp4", contentType: "video/mp4", sizeBytes: 1024 } } as any;
    const res = createRes();

    await createUploadUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: "https://s3.test/upload" });
  });

  it("returns 400 when athlete missing", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue(null);
    const req = { user: { id: 1 }, body: { videoUrl: "https://example.com/video.mp4" } } as any;
    const res = createRes();

    await createVideo(req, res);

    expect(createVideoUpload).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Onboarding incomplete" });
  });

  it("lists videos for athlete", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({ id: 8 });
    (listVideoUploadsByAthlete as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 1 } } as any;
    const res = createRes();

    await listVideos(req, res);

    expect(listVideoUploadsByAthlete).toHaveBeenCalledWith(8);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 1 }] });
  });

  it("returns 404 when review not found", async () => {
    (reviewVideoUpload as jest.Mock).mockResolvedValue(null);
    const req = { user: { id: 1 }, body: { uploadId: 3, feedback: "Nice" } } as any;
    const res = createRes();

    await reviewVideo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Not found" });
  });
});
