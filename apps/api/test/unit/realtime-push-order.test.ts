type QueryResult = unknown[];

function createDbMock(selectResults: QueryResult[], insertResults: QueryResult[]) {
  let selectIndex = 0;
  let insertIndex = 0;

  const nextSelect = () => selectResults[selectIndex++] ?? [];
  const nextInsert = () => insertResults[insertIndex++] ?? [];

  const createSelectQuery = () => {
    const query: any = {};
    query.from = jest.fn(() => query);
    query.innerJoin = jest.fn(() => query);
    query.where = jest.fn(() => query);
    query.orderBy = jest.fn(() => query);
    query.groupBy = jest.fn(() => query);
    query.limit = jest.fn(async () => nextSelect());
    query.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextSelect()).then(resolve, reject);
    return query;
  };

  const createInsertQuery = () => {
    const query: any = {};
    query.values = jest.fn(() => query);
    query.onConflictDoNothing = jest.fn(() => query);
    query.returning = jest.fn(async () => nextInsert());
    query.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextInsert()).then(resolve, reject);
    return query;
  };

  return {
    select: jest.fn(() => createSelectQuery()),
    insert: jest.fn(() => createInsertQuery()),
  };
}

function createSocketMock(order: string[]) {
  const io = {
    to: jest.fn(() => ({
      emit: jest.fn((event: string) => {
        order.push(`emit:${event}`);
      }),
    })),
  };
  return io;
}

function createTrace() {
  return { traceId: "trace-test", startedAt: 0, clientSentAt: null };
}

function flushBackgroundTasks() {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

async function loadServices(params: {
  db: ReturnType<typeof createDbMock>;
  pushEnqueue: jest.Mock;
  io: ReturnType<typeof createSocketMock>;
  order: string[];
}) {
  jest.resetModules();
  jest.doMock("../../src/db", () => ({ db: params.db }));
  jest.doMock("../../src/socket-hub", () => ({ getSocketServer: () => params.io }));
  jest.doMock("../../src/services/outbox.service", () => ({ createPushIntent: params.pushEnqueue, createEmailIntent: jest.fn() }));
  jest.doMock("../../src/lib/db-connectivity", () => ({
    withTransientDbRetryConfigured: (_label: string, fn: () => unknown) => fn(),
  }));
  jest.doMock("../../src/lib/logger", () => ({
    createLogger: () => ({
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    }),
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
  }));
  jest.doMock("../../src/lib/realtime-latency", () => ({
    logRealtimeLatency: (_trace: unknown, stage: string) => {
      params.order.push(`stage:${stage}`);
    },
  }));

  const [messageService, chatService] = await Promise.all([
    import("../../src/services/message.service"),
    import("../../src/services/chat.service"),
  ]);
  return { messageService, chatService };
}

describe("realtime message push ordering", () => {
  afterEach(() => {
    jest.dontMock("../../src/db");
    jest.dontMock("../../src/socket-hub");
    jest.dontMock("../../src/services/outbox.service");
    jest.dontMock("../../src/lib/db-connectivity");
    jest.dontMock("../../src/lib/logger");
    jest.dontMock("../../src/lib/realtime-latency");
  });

  it("returns a direct message without awaiting push enqueue", async () => {
    const order: string[] = [];
    const createdAt = new Date("2026-05-07T00:00:00.000Z");
    const db = createDbMock(
      [
        [], // AI coach lookup
        [{ id: 1 }], // admin coach ids, making sender staff
        [{ name: "Coach", profilePicture: null }], // sender metadata
      ],
      [
        [
          {
            id: 10,
            senderId: 1,
            receiverId: 2,
            content: "hello",
            contentType: "text",
            mediaUrl: null,
            clientMessageId: null,
            videoUploadId: null,
            read: false,
            createdAt,
            updatedAt: createdAt,
          },
        ],
        [], // receipts insert
      ],
    );
    const pushEnqueue = jest.fn(() => {
      order.push("push");
      return new Promise<void>(() => {});
    });
    const io = createSocketMock(order);
    const { messageService } = await loadServices({ db, pushEnqueue, io, order });

    const response = await messageService.sendMessage({
      senderId: 1,
      receiverId: 2,
      content: "hello",
      contentType: "text",
      trace: createTrace(),
    });

    expect(response.id).toBe(10);
    expect(order).toContain("emit:message:new");
    expect(order).toContain("stage:direct.push.background_scheduled");
    expect(order.indexOf("stage:direct.socket.after_broadcast")).toBeLessThan(
      order.indexOf("stage:direct.push.background_scheduled"),
    );
    expect(order).not.toContain("push");
  });

  it("logs direct push failure after the message response returns", async () => {
    const order: string[] = [];
    const createdAt = new Date("2026-05-07T00:00:00.000Z");
    const db = createDbMock(
      [[], [{ id: 1 }], [{ name: "Coach", profilePicture: null }]],
      [
        [
          {
            id: 11,
            senderId: 1,
            receiverId: 2,
            content: "hello",
            contentType: "text",
            mediaUrl: null,
            clientMessageId: null,
            videoUploadId: null,
            read: false,
            createdAt,
            updatedAt: createdAt,
          },
        ],
        [],
      ],
    );
    const pushEnqueue = jest.fn(async () => {
      order.push("push");
      throw new Error("redis unavailable");
    });
    const io = createSocketMock(order);
    const { messageService } = await loadServices({ db, pushEnqueue, io, order });

    await expect(
      messageService.sendMessage({
        senderId: 1,
        receiverId: 2,
        content: "hello",
        contentType: "text",
        trace: createTrace(),
      }),
    ).resolves.toMatchObject({ id: 11 });
    expect(order).not.toContain("stage:direct.push.enqueue_error");
    await flushBackgroundTasks();
    expect(order.indexOf("stage:direct.socket.after_broadcast")).toBeLessThan(
      order.indexOf("stage:direct.push.background_scheduled"),
    );
    expect(order.indexOf("stage:direct.push.background_scheduled")).toBeLessThan(order.indexOf("push"));
    expect(order).toContain("stage:direct.push.enqueue_error");
  });

  it("returns a group message without awaiting push enqueue", async () => {
    const order: string[] = [];
    const createdAt = new Date("2026-05-07T00:00:00.000Z");
    const db = createDbMock(
      [
        [{ userId: 1 }, { userId: 2 }], // group members for receipts and broadcast
        [{ id: 2, expoPushToken: "ExponentPushToken[test]" }], // push recipients
        [{ name: "Coach", email: "coach@example.com", profilePicture: null }],
        [{ name: "Team Chat" }],
      ],
      [
        [
          {
            id: 20,
            groupId: 5,
            senderId: 1,
            content: "hello group",
            contentType: "text",
            mediaUrl: null,
            clientMessageId: null,
            createdAt,
          },
        ],
        [], // receipts insert
      ],
    );
    const pushEnqueue = jest.fn(() => {
      order.push("push");
      return new Promise<void>(() => {});
    });
    const io = createSocketMock(order);
    const { chatService } = await loadServices({ db, pushEnqueue, io, order });

    const response = await chatService.createGroupMessage({
      groupId: 5,
      senderId: 1,
      content: "hello group",
      contentType: "text",
      trace: createTrace(),
    });

    expect(response.id).toBe(20);
    expect(order).toContain("emit:group:message");
    expect(order).toContain("stage:group.push.background_scheduled");
    expect(order.indexOf("stage:group.socket.after_broadcast")).toBeLessThan(
      order.indexOf("stage:group.push.background_scheduled"),
    );
    expect(order).not.toContain("push");
  });

  it("logs group push failure after the message response returns", async () => {
    const order: string[] = [];
    const createdAt = new Date("2026-05-07T00:00:00.000Z");
    const db = createDbMock(
      [
        [{ userId: 1 }, { userId: 2 }],
        [{ id: 2, expoPushToken: "ExponentPushToken[test]" }],
        [{ name: "Coach", email: "coach@example.com", profilePicture: null }],
        [{ name: "Team Chat" }],
      ],
      [
        [
          {
            id: 21,
            groupId: 5,
            senderId: 1,
            content: "hello group",
            contentType: "text",
            mediaUrl: null,
            clientMessageId: null,
            createdAt,
          },
        ],
        [],
      ],
    );
    const pushEnqueue = jest.fn(async () => {
      order.push("push");
      throw new Error("redis unavailable");
    });
    const io = createSocketMock(order);
    const { chatService } = await loadServices({ db, pushEnqueue, io, order });

    await expect(
      chatService.createGroupMessage({
        groupId: 5,
        senderId: 1,
        content: "hello group",
        contentType: "text",
        trace: createTrace(),
      }),
    ).resolves.toMatchObject({ id: 21 });
    expect(order).not.toContain("stage:group.push.enqueue_error");
    await flushBackgroundTasks();
    expect(order.indexOf("stage:group.socket.after_broadcast")).toBeLessThan(
      order.indexOf("stage:group.push.background_scheduled"),
    );
    expect(order.indexOf("stage:group.push.background_scheduled")).toBeLessThan(order.indexOf("push"));
    expect(order).toContain("stage:group.push.enqueue_error");
  });
});
