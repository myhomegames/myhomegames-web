import { useEffect } from "react";

export default function Favicon() {
  useEffect(() => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]'
    );
    existingLinks.forEach((link) => link.remove());

    // Create SVG favicon
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#FFD700" rx="4"/>
  <text x="16" y="16" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="black" text-anchor="middle" dominant-baseline="middle">MY</text>
</svg>
    `;

    // Convert SVG to data URL
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    // Create and add favicon link
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = url;
    document.head.appendChild(link);

    // Cleanup
    return () => {
      URL.revokeObjectURL(url);
      link.remove();
    };
  }, []);

  return null;
}
