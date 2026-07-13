jest.mock("../../src/services/content.service", () => ({
  createContent: jest.fn(),
  getHomeContentForUser: jest.fn(),
  getParentPlatformContent: jest.fn(),
}));

import { listHomeContent, listParentContent, createContentItem } from "../../src/controllers/content.controller";
import { createContent, getHomeContentForUser, getParentPlatformContent } from "../../src/services/content.service";

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("content controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists home content", async () => {
    (getHomeContentForUser as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 7 } } as any;
    const res = createRes();

    await listHomeContent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 1 }] });
  });

  it("lists parent content", async () => {
    (getParentPlatformContent as jest.Mock).mockResolvedValue([{ id: 2 }]);
    const req = { user: { id: 9 } } as any;
    const res = createRes();

    await listParentContent(req, res);

    expect(getParentPlatformContent).toHaveBeenCalledWith(9, undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 2 }] });
  });

  it("creates content item", async () => {
    (createContent as jest.Mock).mockResolvedValue({ id: 3 });
    const req = {
      user: { id: 5 },
      body: {
        title: "Title",
        content: "Body",
        type: "article",
        surface: "home",
      },
    } as any;
    const res = createRes();

    await createContentItem(req, res);

    // objectContaining, not an exact match. The content DTO keeps growing — scheduling
    // (startsAt/endsAt/isActive) and audience targeting (audienceType/audienceTeam/ageList) were
    // both added since this was written, and each addition broke an assertion that was only ever
    // meant to check "the controller forwards the body and stamps createdBy".
    expect(createContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Title",
        content: "Body",
        type: "article",
        surface: "home",
        createdBy: 5,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ item: { id: 3 } });
  });
});
