export type Exercise = {
  id?: number | string;
  name: string;
  category?: string;
  sets?: number | string;
  reps?: number | string;
  time?: number | string;
  rest?: number | string;
  videoUrl?: string;
  videoStatus?: string;
  notes?: string;
  cues?: string;
  howTo?: string;
  progression?: string;
  regression?: string;
};
