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
import { getCachedSkinCss } from "./skins/skinCssCache";
import { isServerSkinId } from "./skins/skinIds";
import { getActiveSkinId } from "./skins/skinStorage";
import { applySkinCss } from "./skins/skinRuntime";

const activeSkinId = getActiveSkinId();
if (isServerSkinId(activeSkinId)) {
  const cached = getCachedSkinCss(activeSkinId);
  applySkinCss(cached ?? "");
} else {
  applySkinCss("");
}

createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
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
  </SettingsProvider>
);
