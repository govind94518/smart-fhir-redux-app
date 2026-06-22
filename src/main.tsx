import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { store } from "./app/store";
import "./styles.css";

const pendingSpaRoute = window.sessionStorage.getItem("spa-redirect-url");

if (pendingSpaRoute) {
  window.sessionStorage.removeItem("spa-redirect-url");

  try {
    const redirectUrl = new URL(pendingSpaRoute);

    if (redirectUrl.origin === window.location.origin && redirectUrl.pathname.startsWith(import.meta.env.BASE_URL)) {
      window.history.replaceState(null, "", `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`);
    }
  } catch {
    window.sessionStorage.removeItem("spa-redirect-url");
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
