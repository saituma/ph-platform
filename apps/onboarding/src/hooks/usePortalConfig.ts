import { useEffect, useState } from "react";

import { DEFAULT_PORTAL_CONFIG, fetchPortalConfig, type PortalConfig } from "@/services/portalConfigService";

export function usePortalConfig(): PortalConfig {
	const [cfg, setCfg] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG);
	useEffect(() => {
		let cancelled = false;
		void fetchPortalConfig().then((next) => {
			if (!cancelled) setCfg(next);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	return cfg;
}
