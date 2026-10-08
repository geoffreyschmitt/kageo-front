import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Kageo Wishlists",
        short_name: "Kageo",
        description: "Manage your wishlists with Kageo",
        start_url: "/",
        display: "standalone",
        // Match --surface-page (light) in shared/styles/theme.css; the manifest cannot vary by scheme.
        background_color: "#f7f4ef",
        theme_color: "#f7f4ef",
        icons: [
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
            {
                src: "/icons/icon-maskable-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
