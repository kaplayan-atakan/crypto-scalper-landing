import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import LiveActions from "./pages/LiveActions";
import { StrategyOveralls } from "./pages/StrategyOveralls";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename="/crypto-scalper-landing">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/live-actions" element={<LiveActions />} />
        <Route path="/strategy-overalls" element={<StrategyOveralls />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
