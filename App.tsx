// The app shell: the window, the navigation stack and the connection store's load.

import { mount } from "nsh";
import { NavStack } from "nsh/base";
import { Window } from "nsh/desktop";
import { nav } from "./src/nav";
import { Home } from "./src/pages/Home";
import { WebViewPage } from "./src/pages/WebViewPage";
import { initConnections } from "./src/store/connections";
import { loadTlsPrefs } from "./src/services/tls";

// Load the remembered certificate preferences before the connections, so the
// first tile already starts on the working address instead of failing once.
// The UI follows the signals the store sets once this resolves.
loadTlsPrefs()
  .then(initConnections)
  .catch((error) => console.error("failed to load app state", error));

function App() {
  return (
    <NavStack state={nav} class="flex-1 bg-background">
      {(route) => {
        if (route.name === "webview") return <WebViewPage connection={route.connection} />;
        return <Home />;
      }}
    </NavStack>
  );
}

mount(() => (
  <Window id="main" title="WeChat Selkies 控制台">
    <App />
  </Window>
));
