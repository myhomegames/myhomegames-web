import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/config";
import "./utils/unauthorizedInterceptor";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { CollectionsProvider } from "./contexts/CollectionsContext";
import { DevelopersProvider } from "./contexts/DevelopersContext";
import { PublishersProvider } from "./contexts/PublishersContext";
import { LibraryGamesProvider } from "./contexts/LibraryGamesContext";
import { TagListsProvider } from "./contexts/TagListsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
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
  </StrictMode>
);
