import { Toaster as Sonner } from "sonner";
import { useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

	useEffect(() => {
		const root = document.documentElement;
		const observer = new MutationObserver(() => {
			const currentTheme = root.getAttribute("data-theme") as "light" | "dark" | null;
			if (currentTheme) {
				setTheme(currentTheme);
			}
		});

		observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
		
		// Initial check
		const initialTheme = root.getAttribute("data-theme") as "light" | "dark" | null;
		if (initialTheme) setTheme(initialTheme);

		return () => observer.disconnect();
	}, []);

	return (
		<Sonner
			theme={theme}
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:font-sans",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
