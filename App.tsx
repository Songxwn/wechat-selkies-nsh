// The app shell: the window, the navigation stack and the connection store's load.

import { mount, View } from "nsh";
import { NavStack } from "nsh/base";
import { Window } from "nsh/desktop";
import { nav } from "./src/nav";
import { Home } from "./src/pages/Home";
import { WebViewPage } from "./src/pages/WebViewPage";
import { initConnections } from "./src/store/connections";

// Load the stored connections before the first interaction; the UI follows the
// signals the store sets once it resolves.
initConnections().catch((error) => console.error("failed to load connections", error));

function App() {
  return (
    <View class="flex-1 bg-background">
      <NavStack state={nav} class="flex-1">
        {(route) => {
          if (route.name === "webview") return <WebViewPage connection={route.connection} />;
          return <Home />;
        }}
      </NavStack>
    </View>
  );
}

mount(() => (
  <Window id="main" title="WeChat Selkies - 本地远程客户端">
    <App />
  </Window>
));
