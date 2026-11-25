// The navigation stack's state, created once; pages import it to navigate.

import { createNavStack } from "nsh/base";
import type { Connection } from "./models/connection";

export type Route = { name: "home" } | { name: "webview"; connection: Connection };

export const nav = createNavStack<Route>([{ name: "home" }]);
