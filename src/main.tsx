import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "virtual:tailwind-entry.css";
import "./i18n/config";
import "./utils/unauthorizedInterceptor";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { TunnelProvider } from "./contexts/TunnelContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ServerConnectivityProvider } from "./contexts/ServerConnectivityContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { CollectionsProvider } from "./contexts/CollectionsContext";
import { DevelopersProvider } from "./contexts/DevelopersContext";
import { PublishersProvider } from "./contexts/PublishersContext";
import { LibraryGamesProvider } from "./contexts/LibraryGamesContext";
import { TagListsProvider } from "./contexts/TagListsContext";
import { SkinProvider } from "./contexts/SkinContext";
import { getCachedSkinCss } from "./skins/skinCssCache";
import { isServerSkinId } from "./skins/skinIds";
import { getActiveSkinId } from "./skins/skinStorage";
import { applySkinCss } from "./skins/skinRuntime";
import { setupPwaInstallFromQuery } from "./utils/pwaInstall";

registerSW({ immediate: true });
setupPwaInstallFromQuery();

const activeSkinId = getActiveSkinId();
if (isServerSkinId(activeSkinId)) {
  const cached = getCachedSkinCss(activeSkinId);
  applySkinCss(cached ?? "");
} else {
  applySkinCss("");
}

createRoot(document.getElementById("root")!).render(
  <TunnelProvider>
    <SettingsProvider>
      <ServerConnectivityProvider>
      <AuthProvider>
      <SkinProvider>
        <LoadingProvider>
          <CollectionsProvider>
            <DevelopersProvider>
              <PublishersProvider>
                <LibraryGamesProvider>
                  <TagListsProvider>
                    <App />
                  </TagListsProvider>
                </LibraryGamesProvider>
              </PublishersProvider>
            </DevelopersProvider>
          </CollectionsProvider>
        </LoadingProvider>
      </SkinProvider>
      </AuthProvider>
      </ServerConnectivityProvider>
    </SettingsProvider>
  </TunnelProvider>
);
