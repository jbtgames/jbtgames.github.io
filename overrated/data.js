(function () {
  const subjects = [
    {
      id: "taylor-swift",
      name: "Taylor Swift",
      type: "Artist",
      year: 2024,
      origin: "Claim to fame · The Eras Tour",
      description:
        "Selling out stadiums worldwide and resetting every streaming record. Cultural icon or hype machine?",
      stats: [
        { icon: "🎟️", label: "Tour stops", value: "146" },
        { icon: "💿", label: "Albums", value: "10" }
      ],
      accent:
        "radial-gradient(circle at top, rgba(255, 180, 215, 0.4), transparent 70%)",
      image:
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Taylor Swift performing on stage",
      overratedScore: 88
    },
    {
      id: "barbie-film",
      name: "Barbie",
      type: "Movie",
      year: 2023,
      origin: "Directed by · Greta Gerwig",
      description:
        "The candy-colored blockbuster that turned every theater pink. Satire genius or marketing juggernaut?",
      stats: [
        { icon: "🍿", label: "Box office", value: "$1.4B" },
        { icon: "🏆", label: "Oscars", value: "8 noms" }
      ],
      accent:
        "radial-gradient(circle at top left, rgba(255, 192, 203, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1570378164207-c63f4e4f5659?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Moviegoers in a cinema lit by pink light",
      overratedScore: 82
    },
    {
      id: "drake",
      name: "Drake",
      type: "Artist",
      year: 2024,
      origin: "Latest era · For All the Dogs",
      description:
        "Every drop dominates playlists, but fans say the formula's wearing thin. Still unstoppable or time for a reset?",
      stats: [
        { icon: "🎧", label: "Monthly listeners", value: "67M" },
        { icon: "🏆", label: "No.1 singles", value: "13" }
      ],
      accent:
        "radial-gradient(circle at bottom right, rgba(120, 180, 255, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Rapper performing under blue stage lights",
      overratedScore: 79
    },
    {
      id: "oppenheimer",
      name: "Oppenheimer",
      type: "Movie",
      year: 2023,
      origin: "Director · Christopher Nolan",
      description:
        "Three hours of prestige filmmaking that became a meme. Historic masterpiece or overblown awards bait?",
      stats: [
        { icon: "📽️", label: "Runtime", value: "181 min" },
        { icon: "⭐", label: "IMDb", value: "8.3" }
      ],
      accent:
        "radial-gradient(circle at center, rgba(255, 190, 120, 0.4), transparent 65%)",
      image:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Film reel projectors glowing in a dark room",
      overratedScore: 74
    },
    {
      id: "fortnite",
      name: "Fortnite",
      type: "Game",
      year: 2024,
      origin: "Built by · Epic Games",
      description:
        "Concerts, brand collabs, and battle royale chaos. Still a cultural hub or a bloated crossover platform?",
      stats: [
        { icon: "🕹️", label: "Players", value: "70M monthly" },
        { icon: "🎉", label: "Collabs", value: "160+" }
      ],
      accent:
        "radial-gradient(circle at top right, rgba(140, 120, 255, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Person playing a colorful video game on a monitor",
      overratedScore: 77
    },
    {
      id: "olivia-rodrigo",
      name: "Olivia Rodrigo",
      type: "Artist",
      year: 2023,
      origin: "Sophomore album · GUTS",
      description:
        "Pop-punk revival for a new generation. Breakout authenticity or derivative diary entries?",
      stats: [
        { icon: "🎤", label: "World tour", value: "75 dates" },
        { icon: "💜", label: "Grammy wins", value: "3" }
      ],
      accent:
        "radial-gradient(circle at bottom left, rgba(200, 140, 255, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1517582082532-16c4d649c5ed?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Singer on stage with purple lighting",
      overratedScore: 71
    },
    {
      id: "last-of-us",
      name: "The Last of Us",
      type: "Series",
      year: 2023,
      origin: "HBO adaptation · Season 1",
      description:
        "Game-to-TV finally done right or prestige horror coasting on nostalgia?",
      stats: [
        { icon: "🧟", label: "Infected count", value: "Too many" },
        { icon: "📺", label: "Viewers", value: "30M" }
      ],
      accent:
        "radial-gradient(circle at bottom, rgba(120, 170, 140, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Overgrown city street at dusk",
      overratedScore: 73
    },
    {
      id: "ariana-grande",
      name: "Ariana Grande",
      type: "Artist",
      year: 2024,
      origin: "New era · Eternal Sunshine",
      description:
        "Whistle tones and pop perfection or playlist wallpaper at this point?",
      stats: [
        { icon: "🎧", label: "Streams", value: "42B" },
        { icon: "🏆", label: "Awards", value: "9" }
      ],
      accent:
        "radial-gradient(circle at top left, rgba(255, 210, 170, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Pop singer silhouetted under pink lights",
      overratedScore: 69
    },
    {
      id: "stranger-things",
      name: "Stranger Things",
      type: "Series",
      year: 2022,
      origin: "Season 4 · Netflix",
      description:
        "Still the king of synth nostalgia or stuck in the Upside Down of fan service?",
      stats: [
        { icon: "👾", label: "Demogorgons", value: "Many" },
        { icon: "📈", label: "Hours viewed", value: "1.4B" }
      ],
      accent:
        "radial-gradient(circle at center, rgba(255, 90, 90, 0.4), transparent 65%)",
      image:
        "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Retro neon lights and fog",
      overratedScore: 70
    },
    {
      id: "marvel-phase5",
      name: "Marvel Phase Five",
      type: "Franchise",
      year: 2025,
      origin: "Saga status · Multiverse",
      description:
        "Superhero fatigue or still unstoppable? Another crossover avalanche waits.",
      stats: [
        { icon: "🎬", label: "Projects", value: "12" },
        { icon: "🌌", label: "Timelines", value: "Infinite" }
      ],
      accent:
        "radial-gradient(circle at top, rgba(160, 220, 255, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Stack of colorful superhero comic books",
      overratedScore: 86
    },
    {
      id: "doja-cat",
      name: "Doja Cat",
      type: "Artist",
      year: 2024,
      origin: "Scarlet era · Planet Doja",
      description:
        "Genre shapeshifter or internet troll turned pop staple?",
      stats: [
        { icon: "📱", label: "TikTok sounds", value: "310" },
        { icon: "🎤", label: "Headliners", value: "25" }
      ],
      accent:
        "radial-gradient(circle at bottom right, rgba(255, 110, 170, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1515162305280-7d34aac4ef74?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Singer with pink lighting on stage",
      overratedScore: 65
    },
    {
      id: "billie-eilish",
      name: "Billie Eilish",
      type: "Artist",
      year: 2024,
      origin: "Hit single · What Was I Made For?",
      description:
        "Whisper pop innovator or mood-board mainstay?",
      stats: [
        { icon: "🎧", label: "Streams", value: "36B" },
        { icon: "🏆", label: "Grammys", value: "7" }
      ],
      accent:
        "radial-gradient(circle at top right, rgba(120, 255, 200, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Musician bathed in green lights",
      overratedScore: 64
    },
    {
      id: "dune-two",
      name: "Dune: Part Two",
      type: "Movie",
      year: 2024,
      origin: "Directed by · Denis Villeneuve",
      description:
        "Sci-fi opera perfection or sandworm slog?",
      stats: [
        { icon: "🏜️", label: "Arrakis scenes", value: "Plenty" },
        { icon: "🍿", label: "Box office", value: "$712M" }
      ],
      accent:
        "radial-gradient(circle at bottom left, rgba(255, 200, 150, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1520358231651-08d28e5f16ff?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Desert landscape at sunset",
      overratedScore: 68
    },
    {
      id: "wednesday-netflix",
      name: "Wednesday",
      type: "Series",
      year: 2022,
      origin: "Netflix hit · Season 1",
      description:
        "Goth girl revival or TikTok-core fad?",
      stats: [
        { icon: "🕺", label: "Dance edits", value: "250K" },
        { icon: "📺", label: "Hours viewed", value: "1.7B" }
      ],
      accent:
        "radial-gradient(circle at top left, rgba(120, 120, 255, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Gothic hallway with purple lighting",
      overratedScore: 67
    },
    {
      id: "bad-bunny",
      name: "Bad Bunny",
      type: "Artist",
      year: 2024,
      origin: "World tour · Most Wanted",
      description:
        "Reggaeton revolutionary or festival mainstay fatigue?",
      stats: [
        { icon: "🌎", label: "Tour cities", value: "45" },
        { icon: "💿", label: "Albums", value: "5" }
      ],
      accent:
        "radial-gradient(circle at center, rgba(255, 170, 110, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Singer jumping on stage with orange lights",
      overratedScore: 72
    },
    {
      id: "zelda-totk",
      name: "Tears of the Kingdom",
      type: "Game",
      year: 2023,
      origin: "Legend of Zelda · Nintendo",
      description:
        "Open-world mastery or crafting grind overload?",
      stats: [
        { icon: "🗺️", label: "Map size", value: "2x Hyrule" },
        { icon: "🛠️", label: "Fuse combos", value: "Infinite" }
      ],
      accent:
        "radial-gradient(circle at top right, rgba(110, 210, 180, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Person holding a game controller near a TV",
      overratedScore: 60
    },
    {
      id: "cybertruck",
      name: "Cybertruck",
      type: "Product",
      year: 2024,
      origin: "Tesla · Stainless steel hype",
      description:
        "Future-proof utility or meme-worthy wedge on wheels?",
      stats: [
        { icon: "⚡", label: "Range", value: "340 mi" },
        { icon: "💰", label: "Price", value: "$61K" }
      ],
      accent:
        "radial-gradient(circle at center, rgba(180, 180, 200, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Futuristic silver vehicle in a studio",
      overratedScore: 90
    },
    {
      id: "post-malone",
      name: "Post Malone",
      type: "Artist",
      year: 2024,
      origin: "Tour · If Y'all Weren't Here",
      description:
        "Genre-blending superstar or playlist wallpaper?",
      stats: [
        { icon: "🎤", label: "Headlining years", value: "8" },
        { icon: "💿", label: "Albums", value: "5" }
      ],
      accent:
        "radial-gradient(circle at bottom, rgba(255, 200, 170, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Singer with microphone on a smoky stage",
      overratedScore: 63
    },
    {
      id: "erastourfilm",
      name: "Eras Tour (Film)",
      type: "Movie",
      year: 2023,
      origin: "Concert film · AMC",
      description:
        "Concert cinema revolution or deluxe merch drop?",
      stats: [
        { icon: "🎬", label: "Runtime", value: "169 min" },
        { icon: "🍿", label: "Domestic gross", value: "$180M" }
      ],
      accent:
        "radial-gradient(circle at top, rgba(255, 140, 200, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Crowd at a concert with colorful confetti",
      overratedScore: 83
    },
    {
      id: "grammy-awards",
      name: "Grammy Awards",
      type: "Event",
      year: 2024,
      origin: "Music industry · 66th ceremony",
      description:
        "Cultural barometer or industry echo chamber?",
      stats: [
        { icon: "🏆", label: "Categories", value: "94" },
        { icon: "🎤", label: "Performances", value: "18" }
      ],
      accent:
        "radial-gradient(circle at top right, rgba(255, 215, 130, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Golden microphone standing under stage lights",
      overratedScore: 78
    },
    {
      id: "coachella",
      name: "Coachella",
      type: "Event",
      year: 2024,
      origin: "Empire Polo Club · Indio",
      description:
        "Festival mecca or influencer backdrop?",
      stats: [
        { icon: "🎡", label: "Stages", value: "8" },
        { icon: "🎟️", label: "Attendees", value: "250K" }
      ],
      accent:
        "radial-gradient(circle at bottom right, rgba(255, 170, 120, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Festival crowd at sunset with ferris wheel",
      overratedScore: 84
    },
    {
      id: "ai-generated-songs",
      name: "AI-Generated Songs",
      type: "Trend",
      year: 2024,
      origin: "Cloned vocals · Viral remixes",
      description:
        "Creative revolution or uncanny valley earworms?",
      stats: [
        { icon: "🤖", label: "Model drops", value: "420" },
        { icon: "🎧", label: "Streams", value: "2.3B" }
      ],
      accent:
        "radial-gradient(circle at top, rgba(170, 200, 255, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Producer working at a laptop with headphones",
      overratedScore: 87
    },
    {
      id: "barbenheimer",
      name: "Barbenheimer",
      type: "Trend",
      year: 2023,
      origin: "Double feature · Meme weekend",
      description:
        "Cinema event of the decade or marketing coincidence?",
      stats: [
        { icon: "🎬", label: "Tickets", value: "200M" },
        { icon: "💬", label: "Memes", value: "Countless" }
      ],
      accent:
        "radial-gradient(circle at center, rgba(255, 120, 160, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=720&q=80",
      imageAlt: "People in a movie theater holding popcorn",
      overratedScore: 76
    },
    {
      id: "mario-movie",
      name: "Super Mario Bros. Movie",
      type: "Movie",
      year: 2023,
      origin: "Nintendo · Illumination",
      description:
        "Pixel-perfect fan service or safe cash-in?",
      stats: [
        { icon: "🍄", label: "Box office", value: "$1.3B" },
        { icon: "⭐", label: "Audience", value: "95%" }
      ],
      accent:
        "radial-gradient(circle at bottom right, rgba(255, 210, 120, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Arcade machine glowing in the dark",
      overratedScore: 66
    },
    {
      id: "adele-vegas",
      name: "Adele: Weekends with Adele",
      type: "Live Show",
      year: 2024,
      origin: "Las Vegas Residency",
      description:
        "Intimate vocal clinic or spendy pilgrimage?",
      stats: [
        { icon: "🎙️", label: "Shows", value: "68" },
        { icon: "💸", label: "Avg ticket", value: "$600" }
      ],
      accent:
        "radial-gradient(circle at top, rgba(240, 200, 150, 0.45), transparent 60%)",
      image:
        "https://images.unsplash.com/photo-1529158062015-cad636e69505?auto=format&fit=crop&w=720&q=80",
      imageAlt: "Spotlight on a singer in a theater",
      overratedScore: 75
    }
  ];

  window.OVERRATED_SUBJECTS = subjects;
})();
