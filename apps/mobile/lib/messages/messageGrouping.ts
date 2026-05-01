import type { ChatMessage } from "@/constants/messages";

export type GroupPosition = "first" | "middle" | "last" | "solo";

export interface MessageGroupMeta {
	position: GroupPosition;
	showAvatar: boolean;
	showSenderName: boolean;
	dateSeparator: string | null;
}

function getSenderId(msg: ChatMessage): string {
	if (msg.senderId != null) return String(msg.senderId);
	return msg.from;
}

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function getDateLabel(isoString: string | undefined): string | null {
	if (!isoString) return null;
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return null;

	const now = new Date();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);

	if (isSameDay(date, now)) return "Today";
	if (isSameDay(date, yesterday)) return "Yesterday";

	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Compute grouping metadata for an array of messages in chronological order.
 * The FlatList is inverted so the caller should pass the original (non-reversed) array.
 */
export function computeGroupingMap(
	messages: ChatMessage[],
): Map<string | number, MessageGroupMeta> {
	const map = new Map<string | number, MessageGroupMeta>();

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		const prev = i > 0 ? messages[i - 1] : null;
		const next = i < messages.length - 1 ? messages[i + 1] : null;

		const senderId = getSenderId(msg);
		const prevSame = prev != null && getSenderId(prev) === senderId;
		const nextSame = next != null && getSenderId(next) === senderId;

		let position: GroupPosition;
		if (prevSame && nextSame) position = "middle";
		else if (prevSame && !nextSame) position = "last";
		else if (!prevSame && nextSame) position = "first";
		else position = "solo";

		let dateSeparator: string | null = null;
		if (prev == null) {
			dateSeparator = getDateLabel(msg.createdAt) ?? getDateLabel(msg.time);
		} else {
			const prevDate = prev.createdAt ? new Date(prev.createdAt) : null;
			const curDate = msg.createdAt ? new Date(msg.createdAt) : null;
			if (prevDate && curDate && !isSameDay(prevDate, curDate)) {
				dateSeparator = getDateLabel(msg.createdAt);
			}
		}

		map.set(msg.id, {
			position,
			showAvatar: position === "last" || position === "solo",
			showSenderName: position === "first" || position === "solo",
			dateSeparator,
		});
	}

	return map;
}
