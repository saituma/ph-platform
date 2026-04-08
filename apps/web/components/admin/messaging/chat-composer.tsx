"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { Paperclip, Send, Smile, Image as ImageIcon, Sticker, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";

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
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const emojiContainerRef = useRef<HTMLDivElement | null>(null);
  const attachmentContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
      if (attachmentContainerRef.current && !attachmentContainerRef.current.contains(target)) {
        setShowAttachmentMenu(false);
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
    <div className="rounded-xl border border-border p-3">
      {replyingTo ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Replying to</p>
            <p className="truncate text-sm text-foreground">{replyingTo.preview}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onCancelReply} aria-label="Cancel reply">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <div ref={emojiContainerRef} className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setShowEmojiPicker((current) => !current);
              setShowAttachmentMenu(false);
            }}
            aria-label="Open emoji picker"
          >
            <Smile className="h-4 w-4" />
          </Button>
          {showEmojiPicker ? (
            <div className="absolute bottom-11 left-0 z-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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
        <div ref={attachmentContainerRef} className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setShowAttachmentMenu((current) => !current);
              setShowEmojiPicker(false);
            }}
            disabled={isUploading}
            aria-label="Add attachment"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          {showAttachmentMenu ? (
            <div className="absolute bottom-11 left-0 z-30 w-52 rounded-xl border border-border bg-card p-2 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  onPickPhoto();
                }}
              >
                <ImageIcon className="h-4 w-4" /> Photo
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  onPickVideo();
                }}
              >
                <Video className="h-4 w-4" /> Video
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  onPickGif();
                }}
              >
                <Sticker className="h-4 w-4" /> GIF (GIPHY)
              </button>
            </div>
          ) : null}
        </div>
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.shiftKey) return;
            if ((event.nativeEvent as any)?.isComposing) return;
            event.preventDefault();
            if (!canSend || isSending || isUploading) return;
            setShowEmojiPicker(false);
            setShowAttachmentMenu(false);
            onSend();
          }}
          placeholder={placeholder}
          className="min-h-11 flex-1"
        />
        <Button
          onClick={onSend}
          size="icon"
          disabled={!canSend || isSending}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {isUploading ? <p className="mt-2 text-xs text-muted-foreground">Uploading attachment...</p> : null}
    </div>
  );
}
