import { useMemo } from "react";
import { getApiBase } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTunnel } from "../contexts/TunnelContext";
import { parseCloudflareTunnelProfile } from "../utils/tunnelProfile";

export function useActiveProfile() {
  const { twitchLoginEnabled } = useSettings();
  const { user, token } = useAuth();
  const { featureEnabled, status } = useTunnel();

  const cloudflareProfile = useMemo(() => {
    if (!featureEnabled || !status?.connected) return null;
    const publicUrl = status.publicUrl?.trim() || getApiBase();
    return parseCloudflareTunnelProfile(publicUrl);
  }, [featureEnabled, status?.connected, status?.publicUrl]);

  const hasTwitchProfile = twitchLoginEnabled && !!(user || token);
  const hasCloudflareProfile = cloudflareProfile !== null;
  const showProfile = hasTwitchProfile || hasCloudflareProfile;

  const displayName = user?.userName || cloudflareProfile?.userName || "User";
  const displayImage = user?.userImage ?? null;

  return {
    showProfile,
    hasTwitchProfile,
    hasCloudflareProfile,
    cloudflareProfile,
    displayName,
    displayImage,
    user,
  };
}
