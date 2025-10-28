import { useState } from "react";
import "./style/app.css";
import AppFrontendCore from "./core";
import { PeerProvider } from "./PeerContext";


export default function App() {
    return (
          <PeerProvider>
            <AppFrontendCore />
        </PeerProvider>
    );
}