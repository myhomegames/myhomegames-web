import { isSmartTvBrowser } from "../../utils/smartTv";

type Website = {
  url: string;
  category?: number;
};

type WebsitesListProps = {
  websites: Website[];
};

/**
 * Map of known domain names to their display names
 */
const KNOWN_SITES: Record<string, string> = {
  "steampowered.com": "Steam",
  "store.steampowered.com": "Steam",
  "epicgames.com": "Epic Games",
  "www.epicgames.com": "Epic Games",
  "gog.com": "GOG",
  "www.gog.com": "GOG",
  "itch.io": "itch.io",
  "xbox.com": "Xbox",
  "playstation.com": "PlayStation",
  "nintendo.com": "Nintendo",
  "twitch.tv": "Twitch",
  "youtube.com": "YouTube",
  "twitter.com": "Twitter",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "reddit.com": "Reddit",
  "discord.com": "Discord",
  "github.com": "GitHub",
  "wikia.com": "Fandom",
  "fandom.com": "Fandom",
};

/**
 * Extracts a readable site name from a URL
 * Examples:
 * - https://www.example.com -> "Example"
 * - https://store.steampowered.com -> "Steam"
 * - https://www.epicgames.com -> "Epic Games"
 */
function getSiteName(url: string): string {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;

    // Check if we have a known site name
    if (KNOWN_SITES[hostname]) {
      return KNOWN_SITES[hostname];
    }

    // Remove www. prefix for lookup
    const hostnameWithoutWww = hostname.replace(/^www\./, "");
    if (KNOWN_SITES[hostnameWithoutWww]) {
      return KNOWN_SITES[hostnameWithoutWww];
    }

    // Extract domain name (remove TLD)
    const parts = hostnameWithoutWww.split(".");
    if (parts.length >= 2) {
      // Get the main domain name (second to last part)
      const domainName = parts[parts.length - 2];

      // Capitalize first letter
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }

    // Fallback: return hostname without www
    return hostnameWithoutWww;
  } catch (e) {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    if (match && match[1]) {
      const hostname = match[1];
      if (KNOWN_SITES[hostname]) {
        return KNOWN_SITES[hostname];
      }
      const domainName = hostname.split(".")[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }

    // Final fallback: return a shortened version of the URL
    return url.length > 30 ? url.substring(0, 27) + "..." : url;
  }
}

function getFaviconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch (e) {
    return null;
  }
}

function SingleWebsiteLink({
  url,
  staticMode,
}: {
  url: string;
  category?: number;
  staticMode: boolean;
}) {
  const siteName = getSiteName(url);
  const faviconUrl = getFaviconUrl(url);
  const content = faviconUrl ? (
    <img
      src={faviconUrl}
      alt=""
      aria-hidden="true"
      className="websites-list-favicon"
      loading="lazy"
    />
  ) : (
    <span className="websites-list-label">{siteName}</span>
  );

  // Smart TV: display-only (no browser / external navigation from the remote).
  if (staticMode) {
    return (
      <span className="websites-list-item websites-list-item--static" title={siteName}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="websites-list-item"
      title={siteName}
    >
      {content}
    </a>
  );
}

export default function WebsitesList({ websites }: WebsitesListProps) {
  if (!websites || websites.length === 0) {
    return null;
  }

  const staticMode = isSmartTvBrowser();

  return (
    <div className={`websites-list${staticMode ? " websites-list--static" : ""}`}>
      {websites.map((website, index) => (
        <span key={index}>
          <SingleWebsiteLink
            url={website.url}
            category={website.category}
            staticMode={staticMode}
          />
          {index < websites.length - 1 && (
            <span className="game-info-list-separator"> </span>
          )}
        </span>
      ))}
    </div>
  );
}
