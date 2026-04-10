import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import { registerClientPwa } from "./pwa/registerClientPwa";
import "./styles/app.css";

registerClientPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App workspaceVariant="client" />
    </I18nProvider>
  </React.StrictMode>
);
