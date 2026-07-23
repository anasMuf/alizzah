import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	envDir: "../../",
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		viteReact(),
	],
	optimizeDeps: {
		include: ["xlsx"],
	},
	server: {
		allowedHosts: ["react-grab.com", "4ac5-182-253-216-67.ngrok-free.app"],
	},
});

export default config;
