import React from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProvider } from "convex/react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import { convex } from "@/lib/convex";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConvexProvider client={convex}>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </ConvexProvider>
);
