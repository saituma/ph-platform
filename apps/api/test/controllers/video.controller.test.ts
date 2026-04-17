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

jest.mock("../../src/services/program-section.service", () => ({
  getProgramSectionContentById: jest.fn(),
}));

jest.mock("../../src/services/training-content-v2.service", () => ({
  getTrainingSessionItemById: jest.fn(),
}));

import { createUploadUrl, createVideo, listVideos, reviewVideo } from "../../src/controllers/video.controller";
import { getPresignedUploadUrl } from "../../src/services/s3.service";
import { createVideoUpload, listVideoUploadsByAthlete, reviewVideoUpload } from "../../src/services/video.service";
import { getAthleteForUser } from "../../src/services/user.service";
import { getProgramSectionContentById } from "../../src/services/program-section.service";
import { getTrainingSessionItemById } from "../../src/services/training-content-v2.service";

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
    const req = {
      user: { id: 1 },
      body: { folder: "training-videos", fileName: "1.mp4", contentType: "video/mp4", sizeBytes: 1024 },
    } as any;
    const res = createRes();

    await createUploadUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      url: "https://s3.test/upload",
      key: expect.stringContaining("training-videos/1/"),
    });
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
    const req = { user: { id: 1 }, query: {} } as any;
    const res = createRes();

    await listVideos(req, res);

    expect(listVideoUploadsByAthlete).toHaveBeenCalledWith(8, { contentId: null });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 1 }] });
  });

  it("creates video for training-content-v2 session item when allowed", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({ id: 8, currentProgramTier: "PHP_Pro" });
    (getTrainingSessionItemById as jest.Mock).mockResolvedValue({ id: 123, allowVideoUpload: true });
    (getProgramSectionContentById as jest.Mock).mockResolvedValue(null);
    (createVideoUpload as jest.Mock).mockResolvedValue({ id: 99 });

    const req = {
      user: { id: 1 },
      body: { videoUrl: "https://example.com/video.mp4", programSectionContentId: 123 },
    } as any;
    const res = createRes();

    await createVideo(req, res);

    expect(getTrainingSessionItemById).toHaveBeenCalledWith(123);
    expect(getProgramSectionContentById).not.toHaveBeenCalled();
    expect(createVideoUpload).toHaveBeenCalledWith({
      athleteId: 8,
      videoUrl: "https://example.com/video.mp4",
      notes: undefined,
      programSectionContentId: null,
      trainingSessionItemId: 123,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ item: { id: 99 } });
  });

  it("returns 403 when session item has uploads disabled", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({ id: 8, currentProgramTier: "PHP_Premium" });
    (getTrainingSessionItemById as jest.Mock).mockResolvedValue({ id: 123, allowVideoUpload: false });
    const req = {
      user: { id: 1 },
      body: { videoUrl: "https://example.com/video.mp4", programSectionContentId: 123 },
    } as any;
    const res = createRes();

    await createVideo(req, res);

    expect(createVideoUpload).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Video uploads are disabled for this training section." });
  });

  it("falls back to legacy program section content when session item not found", async () => {
    (getAthleteForUser as jest.Mock).mockResolvedValue({ id: 8, currentProgramTier: "PHP_Premium_Plus" });
    (getTrainingSessionItemById as jest.Mock).mockResolvedValue(null);
    (getProgramSectionContentById as jest.Mock).mockResolvedValue({ id: 456, allowVideoUpload: true });
    (createVideoUpload as jest.Mock).mockResolvedValue({ id: 100 });

    const req = {
      user: { id: 1 },
      body: { videoUrl: "https://example.com/video.mp4", programSectionContentId: 456 },
    } as any;
    const res = createRes();

    await createVideo(req, res);

    expect(getTrainingSessionItemById).toHaveBeenCalledWith(456);
    expect(getProgramSectionContentById).toHaveBeenCalledWith(456);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ item: { id: 100 } });
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
