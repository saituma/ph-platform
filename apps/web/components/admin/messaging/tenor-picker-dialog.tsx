"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { useDebouncedValue } from "./use-debounced-value";

type TenorGif = {
  id: string;
  url: string;
  previewUrl: string;
};

type TenorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (value: string) => Promise<void> | void;
  results: TenorGif[];
  loading: boolean;
  onSelectGif: (url: string) => Promise<void> | void;
};

export function TenorPickerDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
  onSearch,
  results,
  loading,
  onSelectGif,
}: TenorPickerDialogProps) {
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    if (!open) return;
    void onSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>GIFs from GIPHY</DialogTitle>
          <DialogDescription>Search and send a GIF.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search GIFs (e.g. celebration)"
            aria-label="Search GIFs"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <ScrollArea className="h-[460px] rounded-xl border border-border p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-border hover:border-primary/40"
                  onClick={() => void onSelectGif(gif.url)}
                >
                  <img src={gif.previewUrl} alt="GIF" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading GIFs...</p> : null}
            {!loading && !results.length ? (
              <p className="mt-3 text-sm text-muted-foreground">Search to find GIFs.</p>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
