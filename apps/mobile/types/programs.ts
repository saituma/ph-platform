import { ProgramId } from "@/constants/program-details";

export type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  sessionLabel?: string | null;
};

export type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  completed?: boolean | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
  updatedAt?: string | null;
};

export type TrainingContentV2Workspace = {
  age: number | null;
  tabs: string[];
  modules: any[];
  others: { type: string; label: string; items: any[] }[];
};

export type PlanExercise = {
  id: number;
  order: number;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  completed?: boolean;
  linkedProgramSectionContentId?: number | null;
  linkedProgramSectionContent?: {
    id: number;
    title?: string | null;
    allowVideoUpload?: boolean | null;
    videoUrl?: string | null;
  } | null;
  exercise?: {
    id: number;
    name: string;
    videoUrl?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    cues?: string | null;
  } | null;
};

export type PlanSession = {
  id: number;
  weekNumber: number;
  sessionNumber: number;
  title?: string | null;
  notes?: string | null;
  exercises: PlanExercise[];
};

export type ProgramDetailPanelProps = {
  programId: ProgramId;
  showBack?: boolean;
  onBack?: () => void;
  onNavigate?: (path: string) => void;
  planDetails?: any;
  pricing?: any;
  onApply?: (tierId: any, interval?: any) => Promise<void>;
  latestSubscriptionRequest?: any;
  sharedBoundTag?: string;
};
