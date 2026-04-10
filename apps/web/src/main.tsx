import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <main className="app-shell">
      <section className="content-grid login-grid">
        <article className="panel login-panel">
          <div className="section-heading">
            <h2>TaskBandit Web Entrypoints</h2>
            <span className="section-kicker">Split deployment</span>
          </div>
          <p>
            Use the dedicated client app for everyday chore management and the admin app for
            household configuration and operations.
          </p>
          <div className="button-row">
            <a className="primary-button" href="./client.html">
              Open client UI
            </a>
            <a className="secondary-button" href="./admin.html">
              Open admin UI
            </a>
          </div>
        </article>
      </section>
    </main>
  </React.StrictMode>
);
