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
import emptySkinCss from "./skins/empty/empty-skin.css?raw";
import { applyActiveSkinFromStorage } from "./skins/skinRuntime";

const bundledSkinCss = { plex: PLEX_SKIN_CSS, empty: emptySkinCss };
applyActiveSkinFromStorage(bundledSkinCss);

createRoot(document.getElementById("root")!).render(
  <SkinProvider plexCss={PLEX_SKIN_CSS} emptySkinCss={emptySkinCss}>
    <SettingsProvider>
      <AuthProvider>
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
      </AuthProvider>
    </SettingsProvider>
  </SkinProvider>
);
