"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { Film, Image as ImageIcon, Paperclip, Send, Smile, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "../../ui/input-group";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "../../ui/menu";

type EmojiPick = {
  native?: string;
};

type ChatComposerProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  onSend: () => void;
  canSend: boolean;
  isSending?: boolean;
  isUploading?: boolean;
  replyingTo?: { preview: string } | null;
  onCancelReply?: () => void;
  onPickPhoto: () => void;
  onPickVideo: () => void;
  onPickGif: () => void;
};

export function ChatComposer({
  value,
  onChange,
  placeholder,
  onSend,
  canSend,
  isSending = false,
  isUploading = false,
  replyingTo = null,
  onCancelReply,
  onPickPhoto,
  onPickVideo,
  onPickGif,
}: ChatComposerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const path =
        typeof event.composedPath === "function" ? event.composedPath() : [];
      const clickedInsideEmoji = path.some((node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (emojiContainerRef.current?.contains(node)) return true;
        const tag = node.tagName?.toLowerCase?.() ?? "";
        return tag.startsWith("em-");
      });
      if (!clickedInsideEmoji) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const handleEmojiSelect = (emoji: EmojiPick) => {
    if (!emoji?.native) return;
    onChange(`${value}${emoji.native}`);
  };

  return (
    <div className="rounded-2xl border border-border p-3">
      {replyingTo ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
          <div className="border-l-2 border-primary/50 pl-2 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Replying to</p>
            <p className="truncate text-xs text-foreground">{replyingTo.preview}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onCancelReply} aria-label="Cancel reply">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        {/* Emoji picker */}
        <div ref={emojiContainerRef} className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowEmojiPicker((current) => !current)}
            aria-label="Open emoji picker"
            className="opacity-80 hover:opacity-100"
          >
            <Smile className="h-4 w-4" />
          </Button>
          {showEmojiPicker ? (
            <div className="absolute bottom-11 left-0 z-[1300] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <Picker
                data={emojiData}
                onEmojiSelect={handleEmojiSelect}
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={1}
              />
            </div>
          ) : null}
        </div>

        {/* Attachment menu */}
        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={isUploading}
                aria-label="Add attachment"
                className="opacity-80 hover:opacity-100"
              />
            }
          >
            <Paperclip className="h-4 w-4" />
          </MenuTrigger>
          <MenuPopup align="start" side="top">
            <MenuItem onClick={() => onPickPhoto()}>
              <ImageIcon className="h-4 w-4" /> Photo
            </MenuItem>
            <MenuItem onClick={() => onPickVideo()}>
              <Video className="h-4 w-4" /> Video
            </MenuItem>
            <MenuItem onClick={() => onPickGif()}>
              <Film className="h-4 w-4" /> GIF
            </MenuItem>
          </MenuPopup>
        </Menu>

        {/* Message input with send button */}
        <InputGroup className="flex-1">
          <InputGroupTextarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (event.shiftKey) return;
              if ((event.nativeEvent as any)?.isComposing) return;
              event.preventDefault();
              if (!canSend || isSending || isUploading) return;
              setShowEmojiPicker(false);
              onSend();
            }}
            placeholder={placeholder}
            className="min-h-[3rem]"
          />
          <InputGroupAddon align="inline-end">
            <Button
              onClick={onSend}
              size="icon"
              disabled={!canSend || isSending}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
      {isUploading ? (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Uploading attachment...</p>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
