import { act, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native";

import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
import type { ChatMessage } from "@/constants/messages";
import type { MessageThread, TypingStatus } from "@/types/messages";

const handlers: Record<string, Function> = {};

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: (event: string, cb: Function) => {
      handlers[event] = cb;
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

function Harness() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([
    {
      id: "2",
      name: "Coach",
      role: "Coach",
      preview: "",
      time: "",
      pinned: false,
      premium: false,
      unread: 0,
      lastSeen: "",
      responseTime: "",
    },
  ]);
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});

  useMessagesRealtime({
    token: "token",
    role: "Guardian",
    athleteUserId: null,
    profileId: 1,
    draft: "",
    currentThread: null,
    groupMembers: {},
    loadMessages: jest.fn(),
    setMessages,
    setThreads,
    setTypingStatus,
  });

  return (
    <Text testID="message-count">
      {messages.length}-{threads.length}-{Object.keys(typingStatus).length}
    </Text>
  );
}

describe("useMessagesRealtime", () => {
  beforeEach(() => {
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001/api";
  });

  it("handles incoming message events", () => {
    render(<Harness />);

    act(() => {
      handlers["message:new"]?.({
        id: 11,
        senderId: 2,
        receiverId: 1,
        content: "Hello",
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    const value = screen.getByTestId("message-count").props.children;
    const text = Array.isArray(value) ? value.join("") : String(value);
    expect(text.replace(/,/g, "")).toContain("1-");
  });
});
