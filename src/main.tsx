import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/config";
import "./utils/unauthorizedInterceptor";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { CategoriesProvider } from "./contexts/CategoriesContext";
import { CollectionsProvider } from "./contexts/CollectionsContext";
import { DevelopersProvider } from "./contexts/DevelopersContext";
import { PublishersProvider } from "./contexts/PublishersContext";
import { LibraryGamesProvider } from "./contexts/LibraryGamesContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <LoadingProvider>
        <CategoriesProvider>
          <CollectionsProvider>
            <DevelopersProvider>
              <PublishersProvider>
                <LibraryGamesProvider>
                  <App />
                </LibraryGamesProvider>
              </PublishersProvider>
            </DevelopersProvider>
          </CollectionsProvider>
        </CategoriesProvider>
      </LoadingProvider>
    </AuthProvider>
  </StrictMode>
);
