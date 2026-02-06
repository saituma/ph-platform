import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { EmptyState } from "../empty-state";
import { Skeleton } from "../../ui/skeleton";

type VideoItem = {
  athlete: string;
  topic: string;
  status: string;
};

type VideoGridProps = {
  videos: VideoItem[];
  isLoading?: boolean;
  onOpen: (video: VideoItem) => void;
};

export function VideoGrid({ videos, isLoading = false, onOpen }: VideoGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`video-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <EmptyState
        title="No videos to review"
        description="Client uploads will appear here for feedback."
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <Card key={video.athlete} className="hover:border-primary/40">
          <CardHeader>
            <CardTitle>{video.athlete}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 text-sm text-muted-foreground">
              Video Preview
            </div>
            <p className="text-sm text-foreground">{video.topic}</p>
            <Badge variant={video.status === "Priority" ? "primary" : "outline"}>
              {video.status}
            </Badge>
            <Button className="w-full" variant="outline" onClick={() => onOpen(video)}>
              Open Review
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
