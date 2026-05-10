export type ApiErrorResponse = {
  error: string;
  details?: unknown;
};

export type ApiSuccessResponse<TData> = TData;

export type ApiListResponse<TItem, TKey extends string = "items"> = {
  [K in TKey]: TItem[];
};

export type IdParam = {
  id: string;
};

export type TimestampFields = {
  createdAt: string;
  updatedAt: string;
};

export type UserSummaryDto = {
  id: number | string;
  name: string;
  email: string;
  role: string;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

