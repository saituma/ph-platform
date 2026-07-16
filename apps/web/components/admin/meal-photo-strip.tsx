"use client";

import { useState } from "react";
import NextImage from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export type NutritionLogPhoto = {
  id: number;
  mealSlot: string;
  url: string;
};

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snack",
  snacksMorning: "Morning snack",
  snacksAfternoon: "Afternoon snack",
  snacksEvening: "Evening snack",
};

export function slotLabel(mealSlot: string): string {
  return SLOT_LABELS[mealSlot] ?? mealSlot;
}

export function MealPhotoStrip({ photos }: { photos: NutritionLogPhoto[] | undefined }) {
  const [viewing, setViewing] = useState<NutritionLogPhoto | null>(null);

  if (!photos?.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Food photos
      </div>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setViewing(photo)}
            title={slotLabel(photo.mealSlot)}
            className="group relative overflow-hidden rounded-xl border border-input focus-visible:outline-2 focus-visible:outline-ring"
          >
            <NextImage
              src={photo.url}
              alt={`${slotLabel(photo.mealSlot)} photo`}
              width={96}
              height={96}
              className="h-24 w-24 object-cover transition-transform group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {slotLabel(photo.mealSlot)}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewing ? slotLabel(viewing.mealSlot) : "Meal photo"}</DialogTitle>
          </DialogHeader>
          {viewing ? (
            <NextImage
              src={viewing.url}
              alt={`${slotLabel(viewing.mealSlot)} photo`}
              width={1600}
              height={1200}
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
