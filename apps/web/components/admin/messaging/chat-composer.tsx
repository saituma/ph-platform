"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { Film, Image as ImageIcon, Paperclip, ArrowUp, Smile, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "../../ui/input-group";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "../../ui/menu";

type EmojiPick = {
  native?: string;
};

type ChatComposerProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  "aria-label"?: string;
  onSend: () => void;
  canSend: boolean;
  isSending?: boolean;
  isUploading?: boolean;
  uploadProgress?: number | null;
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
  "aria-label": ariaLabel,
  onSend,
  canSend,
  isSending = false,
  isUploading = false,
  uploadProgress = null,
  replyingTo = null,
  onCancelReply,
  onPickPhoto,
  onPickVideo,
  onPickGif,
}: ChatComposerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowEmojiPicker(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: EmojiPick) => {
      const emojiStr = emoji?.native ?? "";
      if (!emojiStr) return;
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const newValue = value.slice(0, start) + emojiStr + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = start + emojiStr.length;
          el.selectionEnd = start + emojiStr.length;
          el.focus();
        });
      } else {
        onChange(`${value}${emojiStr}`);
      }
      setShowEmojiPicker(false);
    },
    [value, onChange],
  );

  return (
    <div className="w-full min-w-0">
      {replyingTo ? (
        <div className="mb-1 flex items-start justify-between gap-2 rounded-t-lg border border-b-0 border-border bg-secondary/30 px-3 py-2">
          <div className="border-l-2 border-primary/50 pl-2 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Replying to</p>
            <p className="truncate text-xs text-foreground">{replyingTo.preview}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="relative">
        <InputGroup className={replyingTo ? "rounded-t-none" : undefined}>
          <InputGroupTextarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (event.shiftKey) return;
              if ((event.nativeEvent as KeyboardEvent & { isComposing?: boolean })?.isComposing) return;
              event.preventDefault();
              if (!canSend || isSending || isUploading) return;
              setShowEmojiPicker(false);
              onSend();
            }}
            placeholder={placeholder}
            aria-label={ariaLabel ?? placeholder}
            className="min-h-[2.5rem]"
          />
          <InputGroupAddon align="block-end" className="gap-1">
            {/* Emoji */}
            <div ref={emojiContainerRef} className="relative">
              <InputGroupButton
                ref={emojiButtonRef}
                size="icon-sm"
                aria-label="Open emoji picker"
                onClick={() => setShowEmojiPicker((current) => !current)}
              >
                <Smile className="h-4 w-4" />
              </InputGroupButton>
              {showEmojiPicker ? (
                <div className="absolute bottom-10 left-0 z-[1300] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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

            {/* Attachments */}
            <Menu>
              <MenuTrigger
                render={
                  <InputGroupButton
                    size="icon-sm"
                    disabled={isUploading}
                    aria-label="Add attachment"
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

            {/* Send */}
            <InputGroupButton
              size="icon-sm"
              variant="default"
              className="ml-auto"
              onClick={onSend}
              disabled={!canSend || isSending}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {isUploading ? (
        <div className="mt-2 space-y-1 px-1">
          <p className="text-xs text-muted-foreground">
            {uploadProgress != null ? `Uploading attachment… ${uploadProgress}%` : "Uploading attachment…"}
          </p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            {uploadProgress != null ? (
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${uploadProgress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
