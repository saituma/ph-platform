import { useRef, useState, useCallback, useEffect } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ChatMessage } from "@/constants/messages";

type ChatListRef = {
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
  scrollToIndex: (params: {
    index: number;
    animated?: boolean;
    viewPosition?: number;
  }) => void;
  scrollToEnd?: (params?: { animated?: boolean }) => void;
};

function scrollListToEnd(list: ChatListRef | null, animated: boolean) {
  if (!list) return;
  if (list.scrollToEnd) {
    list.scrollToEnd({ animated });
    return;
  }
  list.scrollToOffset({ offset: Number.MAX_SAFE_INTEGER, animated });
}

export function useChatScroll(messages: ChatMessage[], threadId: string) {
  const listRef = useRef<ChatListRef | null>(null);
  const isNearBottomRef = useRef(true);
  const hasInitialScrolled = useRef<string | null>(null);
  const previousLengthRef = useRef(0);
  const [newIncomingCount, setNewIncomingCount] = useState(0);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  useEffect(() => {
    if (hasInitialScrolled.current === threadId) return;
    hasInitialScrolled.current = threadId;
    previousLengthRef.current = messages.length;
    setNewIncomingCount(0);
    requestAnimationFrame(() => {
      scrollListToEnd(listRef.current, false);
    });
  }, [threadId, messages.length]);

  useEffect(() => {
    const previousLength = previousLengthRef.current;
    previousLengthRef.current = messages.length;
    if (messages.length <= previousLength) return;
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.from === "user") {
      requestAnimationFrame(() => {
        scrollListToEnd(listRef.current, true);
      });
      setNewIncomingCount(0);
    } else if (isNearBottomRef.current) {
      setNewIncomingCount(0);
    } else {
      setNewIncomingCount((prev) => Math.min(prev + 1, 99));
    }
  }, [messages.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const wasNearBottom = isNearBottomRef.current;
      isNearBottomRef.current = distanceFromBottom < 80;
      if (isNearBottomRef.current && !wasNearBottom) setNewIncomingCount(0);
    },
    [],
  );

  const jumpTo = useCallback(
    (messageId: number) => {
      const chronoIndex = messages.findIndex((m) => Number(m.id) === messageId);
      if (chronoIndex < 0) return;
      listRef.current?.scrollToIndex({
        index: chronoIndex,
        animated: true,
        viewPosition: 0.5,
      });
      setHighlightedId(messageId);
      setTimeout(() => setHighlightedId(null), 1500);
    },
    [messages],
  );

  return {
    listRef,
    handleScroll,
    jumpTo,
    newIncomingCount,
    setNewIncomingCount,
    highlightedId,
  };
}
