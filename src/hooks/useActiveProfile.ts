import { useMemo } from "react";
import { getApiBase } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTunnel } from "../contexts/TunnelContext";
import { parseCloudflareTunnelProfile } from "../utils/tunnelProfile";

export function useActiveProfile() {
  const { user } = useAuth();
  const { featureEnabled, status } = useTunnel();

  const cloudflareProfile = useMemo(() => {
    if (!featureEnabled || !status?.connected) return null;
    const publicUrl = status.publicUrl?.trim() || getApiBase();
    return parseCloudflareTunnelProfile(publicUrl);
  }, [featureEnabled, status?.connected, status?.publicUrl]);

  const hasCloudflareProfile = cloudflareProfile !== null;
  const showProfile = hasCloudflareProfile || !!user;

  const displayName = user?.userName || cloudflareProfile?.userName || "User";
  const displayImage = user?.userImage ?? null;

  return {
    showProfile,
    hasCloudflareProfile,
    cloudflareProfile,
    displayName,
    displayImage,
    user,
  };
}
