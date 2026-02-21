// components/ZillowLayout.tsx

import { useState } from "react";

type Location = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
};

export default function ZillowLayout({
  title,
  locations,
}: {
  title: string;
  locations: Location[];
}) {
  const [selected, setSelected] = useState<Location | null>(null);

  return (
    <div className="flex h-[75vh] w-full bg-black">

      {/* LEFT: MAP */}
      <div className="w-2/3 relative">
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white">
          Map API goes here
        </div>
      </div>

      {/* RIGHT: LISTINGS */}
      <div className="w-1/3 bg-purple-950 overflow-y-auto p-4 space-y-4">
        <h2 className="text-xl font-bold text-purple-300 mb-4">
          {title}
        </h2>

        {locations.map((loc) => (
          <div
            key={loc.id}
            onClick={() => setSelected(loc)}
            className={`p-3 rounded-lg cursor-pointer transition ${
              selected?.id === loc.id
                ? "bg-purple-700"
                : "bg-purple-900 hover:bg-purple-800"
            }`}
          >
            <h3 className="font-semibold">{loc.name}</h3>
            <p className="text-sm text-purple-300 truncate">
              {loc.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}