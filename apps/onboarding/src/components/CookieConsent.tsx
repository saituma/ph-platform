import { useState, useEffect } from "react";

const STORAGE_KEY = "ph-cookie-consent";

export function CookieConsent() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!localStorage.getItem(STORAGE_KEY)) {
			setVisible(true);
		}
	}, []);

	if (!visible) return null;

	const accept = () => {
		localStorage.setItem(STORAGE_KEY, "accepted");
		setVisible(false);
	};

	const manage = () => {
		localStorage.setItem(STORAGE_KEY, "minimal");
		setVisible(false);
	};

	return (
		<div className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6 pointer-events-none">
			<div className="pointer-events-auto max-w-lg mx-auto bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
				<p className="text-sm text-white/70 leading-relaxed mb-4">
					We use cookies for authentication and analytics to improve your experience.
				</p>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={manage}
						className="px-4 py-2 text-xs font-medium tracking-wider uppercase text-white/50 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-colors"
					>
						Essential Only
					</button>
					<button
						type="button"
						onClick={accept}
						className="px-4 py-2 text-xs font-medium tracking-wider uppercase bg-[#8aff00] text-black rounded-lg hover:bg-[#7ae600] transition-colors"
					>
						Accept All
					</button>
				</div>
			</div>
		</div>
	);
}
