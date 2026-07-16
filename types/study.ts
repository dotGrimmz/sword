export type StudyMaterialKind = "link" | "file";

export type StudyMaterial = {
  id: string;
  pre_read_id: string;
  title: string;
  kind: StudyMaterialKind;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  sort_order: number;
};

export type WeeklyStudy = {
  id: string;
  title: string;
  week_start: string;
  book: string;
  chapter: number;
  verses_range: string | null;
  summary: string;
  memory_verse: string | null;
  reflection_questions: string[] | null;
  poll_question: string | null;
  poll_options: string[] | null;
  published: boolean;
  is_cancelled: boolean;
  materials?: StudyMaterial[];
};

export type LinkMaterialInput = {
  preReadId: string;
  title: string;
  url: string;
  sortOrder?: number;
};
