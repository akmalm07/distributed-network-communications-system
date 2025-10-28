import { useEffect, useState } from "react";
import "./style/core.css";
import { usePeer } from "./PeerContext";
import { fromStringKey } from "./crypto.ts";

export default function AppFrontendCore() {
    const [count, setCount] = useState(0);

    const { peer } = usePeer();

    return (
        <>
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">

            <main className="flex flex-col items-center gap-4 mt-10">
                <h1 className="text-4xl font-bold">Hello, React + TypeScript 👋</h1>

                <p className="text-lg">
                This is your <strong>App.tsx</strong> — the root of your UI.
                </p>

                <button
                onClick={() => {setCount(count + 1); peer?.sendDataDebug(fromStringKey(` Button clicked ${count + 1} times`)); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
                >
                You clicked {count} times
                </button>
            </main>

            </div>
        </>
    );
}