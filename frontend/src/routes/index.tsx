import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="bg-black text-white">

      {/* HERO SECTION */}
      <section
        className="relative h-[75vh] flex flex-col items-center justify-center text-center bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/images/city_banner.jpg')",
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/75" />

        {/* LOGIN BUTTON */}
        <div className="absolute top-6 right-8 z-20">
          <Link
            to="/login"
            className="px-6 py-2 rounded-full bg-purple-700 hover:bg-purple-600 transition-all duration-300 shadow-[0_0_15px_rgba(200,100,255,0.7)] font-semibold"
          >
            Login
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 px-4">
          <h1 className="text-7xl md:text-8xl font-club text-purple-400 drop-shadow-[0_0_25px_rgba(200,100,255,0.9)]">
            Card Maps
          </h1>

          <p className="mt-4 text-2xl md:text-3xl text-purple-300 tracking-wide drop-shadow-[0_0_10px_rgba(200,100,255,0.7)]">
            Las Vegas - Nevada
          </p>
          
          <Link
            to="/map"
            className="inline-block mt-12 px-10 py-4 bg-purple-600 hover:bg-purple-500 transition-all duration-300 rounded-full shadow-[0_0_20px_rgba(200,100,255,0.8)] font-semibold text-lg"
          >
            Explore Now
          </Link>
        </div>
      </section>

      {/* INFO SECTION */}
      <section className="bg-[linear-gradient(to_bottom,_#050000,_#2a0f4a,_#3b0764,_#2a0f4a,_black)] py-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">

          <h2 className="text-4xl md:text-5xl font-semibold text-purple-300">
            Discover Vegas Like Never Before
          </h2>

          <p className="text-lg text-purple-200 leading-relaxed">
            CardMaps is your interactive nightlife and venue discovery
            platform for Las Vegas. Whether you're looking for premium
            liquor stores, high-energy clubs, iconic casinos, or specialty
            smoke shops, CardMaps delivers a dynamic map-driven experience
            inspired by the ease and clarity of modern real estate platforms.
          </p>

          <p className="text-lg text-purple-200 leading-relaxed">
            Explore curated locations, compare venues, and uncover the best
            spots across the Strip and beyond — all through a sleek,
            neon-inspired interface built for the city that never sleeps.
          </p>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">

            <div className="bg-purple-900/40 backdrop-blur-md p-6 rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold text-purple-300 mb-3">
                Interactive Maps
              </h3>
              <p className="text-purple-200 text-sm">
                Real-time map integration with detailed location insights.
              </p>
            </div>

            <div className="bg-purple-900/40 backdrop-blur-md p-6 rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold text-purple-300 mb-3">
                Curated Venues
              </h3>
              <p className="text-purple-200 text-sm">
                Discover the most relevant and exciting spots in Las Vegas.
              </p>
            </div>

            <div className="bg-purple-900/40 backdrop-blur-md p-6 rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold text-purple-300 mb-3">
                Seamless Experience
              </h3>
              <p className="text-purple-200 text-sm">
                A modern, intuitive interface designed for nightlife explorers.
              </p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}