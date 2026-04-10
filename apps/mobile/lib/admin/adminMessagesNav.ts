export type AdminMessagesNavTarget = {
  userId: number;
  name?: string;
  videoUploadId?: number;
};

let _pendingTarget: AdminMessagesNavTarget | null = null;

export function setAdminMessagesNavTarget(target: AdminMessagesNavTarget | null) {
  _pendingTarget = target;
}

export function consumeAdminMessagesNavTarget(): AdminMessagesNavTarget | null {
  const target = _pendingTarget;
  _pendingTarget = null;
  return target;
}
