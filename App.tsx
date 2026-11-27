// The app shell: the window, the navigation stack and the connection store's load.

import { mount } from "nsh";
import { NavStack } from "nsh/base";
import { Window } from "nsh/desktop";
import { Tls } from "tls-native";
import { nav } from "./src/nav";
import { Home } from "./src/pages/Home";
import { WebViewPage } from "./src/pages/WebViewPage";
import { initConnections } from "./src/store/connections";
import { setCertificateBypass } from "./src/services/tls";

// Ask the native module to let the platform web view accept an untrusted
// certificate (Windows: WebView2's --ignore-certificate-errors). It has to
// happen before the first WebView exists, so before mount() creates the window.
setCertificateBypass(Tls.accept());

// Load the stored connections before the first interaction; the UI follows the
// signals the store sets once it resolves.
initConnections().catch((error) => console.error("failed to load connections", error));

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