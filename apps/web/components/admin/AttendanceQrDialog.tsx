"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useGenerateAttendanceQrMutation } from "../../lib/apiSlice";

interface AttendanceQrDialogProps {
  sessionId: number;
  sessionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceQrDialog({
  sessionId,
  sessionName,
  open,
  onOpenChange,
}: AttendanceQrDialogProps) {
  const [generateQr, { isLoading }] = useGenerateAttendanceQrMutation();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(async () => {
    setError(null);
    try {
      const result = await generateQr({ sessionId }).unwrap();
      setToken(result.token);
      setExpiresAt(result.expiresAt);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Failed to generate QR code");
      setToken(null);
      setExpiresAt(null);
    }
  }, [generateQr, sessionId]);

  // Generate on open
  useEffect(() => {
    if (open) {
      void generate();
    } else {
      setToken(null);
      setExpiresAt(null);
      setError(null);
      setSecondsLeft(0);
    }
  }, [open, generate]);

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(diff);
      if (diff <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    update();
    timerRef.current = setInterval(update, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = expiresAt && secondsLeft <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance QR Code</DialogTitle>
          <DialogDescription>{sessionName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {isLoading ? (
            <div className="flex h-[280px] w-[280px] items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Generating...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-[280px] w-[280px] items-center justify-center rounded-lg border border-dashed border-red-300">
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          ) : token ? (
            <>
              <div
                className={`rounded-xl border-2 p-4 ${
                  expired
                    ? "border-red-300 opacity-40"
                    : "border-border"
                }`}
              >
                <QRCodeSVG value={token} size={280} level="M" />
              </div>
              {expired ? (
                <p className="text-sm font-medium text-red-600">
                  QR code expired
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Expires in{" "}
                  <span className="font-semibold text-foreground">
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>
                </p>
              )}
            </>
          ) : null}

          <Button
            variant="outline"
            disabled={isLoading}
            onClick={() => void generate()}
          >
            {isLoading ? "Generating..." : token ? "Regenerate" : "Generate QR Code"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Athletes scan this code from the mobile app to check in to the
            session.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
