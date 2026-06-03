type Listener = () => void;

const listeners = new Set<Listener>();

export function emitMessagingUnreadChanged() {
  for (const listener of [...listeners]) {
    listener();
  }
}

export function subscribeMessagingUnreadChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
