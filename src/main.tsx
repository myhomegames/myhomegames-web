import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/config";
import "./utils/unauthorizedInterceptor";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { CollectionsProvider } from "./contexts/CollectionsContext";
import { DevelopersProvider } from "./contexts/DevelopersContext";
import { PublishersProvider } from "./contexts/PublishersContext";
import { LibraryGamesProvider } from "./contexts/LibraryGamesContext";
import { TagListsProvider } from "./contexts/TagListsContext";
import { SkinProvider } from "./contexts/SkinContext";
import { PLEX_SKIN_CSS } from "./skins/plex/bundle";
import { applyActiveSkinFromStorage, applySkinCss } from "./skins/skinRuntime";
import { getActiveSkinId } from "./skins/skinStorage";
import { isBuiltinSkinId } from "./skins/skinIds";

const bundledSkinCss = { plex: PLEX_SKIN_CSS };
if (isBuiltinSkinId(getActiveSkinId())) {
  applyActiveSkinFromStorage(bundledSkinCss);
} else {
  applySkinCss(PLEX_SKIN_CSS);
}

createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <AuthProvider>
      <SkinProvider plexCss={PLEX_SKIN_CSS}>
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
  </SettingsProvider>
);
