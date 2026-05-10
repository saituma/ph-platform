export const queryKeys = {
	me: ["me"] as const,
	children: ["children"] as const,
	child: (id: string) => ["children", id] as const,
	childPrograms: (id: string) => ["children", id, "programs"] as const,
	childProgress: (id: string) => ["children", id, "progress"] as const,
	billing: ["billing"] as const,
	billingPlans: ["billing", "plans"] as const,
	billingInvoices: ["billing", "invoices"] as const,
	messages: ["messages"] as const,
	messagesInbox: ["messages", "inbox"] as const,
	chatGroups: ["chat", "groups"] as const,
	childInjuryLogs: (id: string) => ["children", id, "injury-logs"] as const,
};
