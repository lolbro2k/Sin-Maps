import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import React from 'react'
import ReactDOM from 'react-dom/client'
// import Map from '../components/map.tsx'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { Link } from '@tanstack/react-router'

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <Map />
//   </React.StrictMode>
// )

export const Route = createFileRoute("/")({
  component: Home,
});

// Map
<Link
  to="/map"
  className="inline-block px-6 py-2 rounded-full bg-purple-600 text-white"
>
  Open Map
</Link>
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

function Home() {
  const [activeSection, setActiveSection] = useState("liquor");

  const sections = [
    { id: "liquor", label: "Liquor Stores", content: "" },
    { id: "smoke", label: "Smoke Shops", content: "" },
    { id: "club", label: "Clubs", content: "" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black text-white">
      <div className="container mx-auto px-4 pt-16 text-center">

        {/* Neon Title */}
        <h1 className="text-6xl md:text-7xl font-cursive tracking-wide mb-2 text-purple-400 drop-shadow-[0_0_10px_rgba(200,100,255,0.7)]">
          Card Maps
        </h1>

        {/* Subtext */}
        <p className="text-2xl md:text-3xl text-purple-300 mb-8 drop-shadow-[0_0_5px_rgba(200,100,255,0.5)]">
          Las Vegas, Nevada
        </p>

        {/* Section Strip */}
        <div className="flex justify-center gap-6 mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-2 rounded-full transition-colors duration-300 font-semibold ${
                activeSection === section.id
                  ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(200,100,255,0.7)]"
                  : "bg-purple-800 text-purple-200 hover:bg-purple-700 hover:text-white"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Section Content, incorporate Zillow style layout*/}
        

      </div>
    </div>
  );
}