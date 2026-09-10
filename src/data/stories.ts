import type { Story } from "./types.ts";

export const STORIES: Story[] = [
  {
    id: "arrival",
    title: "The Squeeze",
    subtitle: "Six stops · ~1.5 minutes",
    thesis:
      "Cape Town is a city squeezed between a mountain and a harbour, and that squeeze explains everything else about it.",
    theme: "Orientation",
    accent: "#E0A45E",
    stops: [
      {
        placeId: "table-mountain-cableway",
        narration:
          "Every road in the centre runs one of two ways: up the mountain or down to the sea. There is no room to spread. The city grew in a bowl because the mountain would not move.",
        shot: "context",
        seconds: 18,
      },
      {
        placeId: "signal-hill",
        narration:
          "The noon gun has fired from this slope since 1806, moved up from the Castle when the noise disturbed the town. Ships in the bay set their chronometers by the puff of smoke, not the bang.",
        shot: "hero",
        seconds: 15,
      },
      {
        placeId: "bo-kaap",
        narration:
          "The first mosque in South Africa stands a few streets below, founded in 1794 by an exile held on Robben Island. The bright paint is recent; the community's claim to this slope is not.",
        shot: "close",
        seconds: 14,
      },
      {
        placeId: "companys-garden",
        narration:
          "Planted in 1652 to feed ships rounding the Cape, the garden was worked by enslaved people from the lodge at its edge. It is the country's oldest cultivated ground.",
        shot: "hero",
        seconds: 12,
      },
      {
        placeId: "city-hall",
        narration:
          "On 11 February 1990, Nelson Mandela spoke from this balcony to a crowd on the Grand Parade, hours after walking out of Victor Verster prison. It was his first public speech in twenty-seven years.",
        shot: "close",
        seconds: 16,
      },
      {
        placeId: "va-waterfront",
        narration:
          "Before the harbour was built in the 1860s, ships anchored in an open bay and lost cargo to the north-west gales. The basin is reclaimed ground: the city made its own door to the world.",
        shot: "hero",
        seconds: 14,
      },
    ],
  },
  {
    id: "memory",
    title: "What Was Removed",
    subtitle: "Five stops · ~1.5 minutes",
    thesis:
      "Cape Town was built by enslaved and dispossessed people, and it still carries the map of that.",
    theme: "Memory",
    accent: "#C2705E",
    stops: [
      {
        placeId: "district-six",
        narration:
          "Between 1968 and 1982 the state bulldozed this neighbourhood to make it white. Sixty thousand people were moved to the Cape Flats, twenty-five kilometres out. The museum's floor map is signed by those who lived here.",
        shot: "close",
        seconds: 20,
      },
      {
        placeId: "castle-of-good-hope",
        narration:
          "The Castle was built by the VOC between 1666 and 1679, largely with enslaved labour. Its five bastions cover every approach, landward as well as seaward, because a garrison that rules by force builds to face its own city.",
        shot: "hero",
        seconds: 18,
      },
      {
        placeId: "greenmarket-square",
        narration:
          "This square was laid out in 1696, and enslaved people were sold on it beside produce from the Company's Garden. The Old Town House on its western edge now holds a collection of Dutch paintings.",
        shot: "hero",
        seconds: 14,
      },
      {
        placeId: "city-hall",
        narration:
          "City Hall opened in 1905, an Edwardian monument to municipal power on the edge of the Grand Parade. For a century the Parade was where the city gathered to be governed, to protest, and in 1990 to celebrate.",
        shot: "context",
        seconds: 16,
      },
      {
        placeId: "langa",
        narration:
          "Langa was laid out in 1927 to hold people removed from Ndabeni, further from the white city. Its residents were meant to be temporary workers, not families. On 21 March 1960, police fired on a pass-law march here.",
        shot: "context",
        seconds: 20,
      },
    ],
  },
  {
    id: "mountain",
    title: "The Machine",
    subtitle: "Six stops · ~1.7 minutes",
    thesis:
      "The mountain is not scenery; it is the machine that makes the city's weather and its water.",
    theme: "Terrain",
    accent: "#7FA678",
    stops: [
      {
        placeId: "lions-head",
        narration:
          "Lion's Head is a leftover ridge of the same sandstone that caps Table Mountain, standing after the softer rock around it wore away. The wind that funnels over the saddle is the south-easter the city calls the Cape Doctor.",
        shot: "hero",
        seconds: 17,
      },
      {
        placeId: "table-mountain-cableway",
        narration:
          "The tablecloth is not mist. It is air driven up the northern face, cooling until its moisture condenses and spills over the plateau like a lid. When the cloud sits, the mountain is making the city's weather.",
        shot: "context",
        seconds: 20,
      },
      {
        placeId: "platteklip-gorge",
        narration:
          "Platteklip is the oldest way up: a 700-metre climb up a ravine that follows a joint in the sandstone, stepped with stone so the route stays one line from the city floor to the plateau.",
        shot: "close",
        seconds: 18,
      },
      {
        placeId: "maclears-beacon",
        narration:
          "Thomas Maclear built this cairn to check the shape of the earth. His survey found the plumb lines pulled sideways by the mountain's own mass, which is why the Cape's arc of the meridian had never added up.",
        shot: "close",
        seconds: 19,
      },
      {
        placeId: "kirstenbosch",
        narration:
          "Kirstenbosch was founded in 1913 to grow only indigenous plants, and it was the first garden to raise Welwitschia under cultivation. It thrives on the mountain's wet eastern flank, away from the dry Atlantic coast.",
        shot: "hero",
        seconds: 14,
      },
      {
        placeId: "twelve-apostles",
        narration:
          "The Twelve Apostles are not twelve separate peaks but one buttress line, and each ravine between them carries the mountain's rain down to the sea. This flank takes the north-west fronts and once fed the city's first reservoirs.",
        shot: "context",
        seconds: 16,
      },
    ],
  },
  {
    id: "coast",
    title: "The Cold Edge",
    subtitle: "Five stops · ~1.3 minutes",
    thesis:
      "The cold, wealthy Atlantic edge faces the sunset while the rest of the city faces away from it.",
    theme: "Atlantic",
    accent: "#4E9DB5",
    stops: [
      {
        placeId: "green-point-lighthouse",
        narration:
          "The light marks the point where the Atlantic seaboard turns north into Table Bay. At sunset the sun drops straight into the sea here, on the one edge of the city that faces it.",
        shot: "hero",
        seconds: 15,
      },
      {
        placeId: "sea-point-promenade",
        narration:
          "The sea wall went up in the early 1920s to stop storms eating Beach Road. Italian prisoners of war worked on parts of it in the 1940s, and the city has been rebuilding it against the same sea ever since.",
        shot: "context",
        seconds: 16,
      },
      {
        placeId: "clifton-beaches",
        narration:
          "Clifton sits behind a ridge that blocks the south-easter, so the sand stays put while Camps Bay next door is stripped in a gale. The water is cold because the Benguela current carries it up from the Southern Ocean.",
        shot: "close",
        seconds: 15,
      },
      {
        placeId: "camps-bay",
        narration:
          "Camps Bay was not a fishing village; it was farmland and a speculator's resort. In 1901 an electric tram reached the beach, and the palms were planted to sell plots to city day-trippers. The line closed in 1930.",
        shot: "hero",
        seconds: 16,
      },
      {
        placeId: "hout-bay",
        narration:
          "Hout Bay was a timber station before it was a harbour; the breakwater only went up in 1937. Chapman's Peak Drive, blasted through the cliff above, took seven years and opened in 1922.",
        shot: "context",
        seconds: 14,
      },
    ],
  },
  {
    id: "harbour",
    title: "The Door",
    subtitle: "Six stops · ~1.2 minutes",
    thesis:
      "This harbour connected the Cape to the world, and the peninsula's villages were built to serve it.",
    theme: "Trade",
    accent: "#8E86B8",
    stops: [
      {
        placeId: "clock-tower",
        narration:
          "The 1882 clock tower was the harbour's control point, where the port captain decided which ship entered which basin. Convicts held in the tidal gaols nearby built the breakwater.",
        shot: "close",
        seconds: 12,
      },
      {
        placeId: "va-waterfront",
        narration:
          "The mall sits on old piers. Fishing boats still land on the far quays and the repair yard still works; the shops are only the top layer.",
        shot: "context",
        seconds: 11,
      },
      {
        placeId: "zeitz-mocaa",
        narration:
          "These silos held grain, not art, until 1990. Heatherwick's studio carved a single atrium through forty-two concrete tubes and left the cut walls showing; the museum opened in 2017.",
        shot: "close",
        seconds: 13,
      },
      {
        placeId: "muizenberg",
        narration:
          "The railway reached Muizenberg in 1882 and made it the country's first seaside resort. The bathing boxes arrived in 1929; the break at Surfer's Corner still teaches the city to surf.",
        shot: "hero",
        seconds: 13,
      },
      {
        placeId: "simons-town",
        narration:
          "Simon's Town was a VOC supply station from 1743, a Royal Navy base for a century and a half after that, and the South African Navy's from 1957.",
        shot: "context",
        seconds: 11,
      },
      {
        placeId: "boulders-beach",
        narration:
          "The colony began with two breeding pairs in 1982. A recent count found fewer than eight hundred breeding pairs, and the African penguin is now critically endangered.",
        shot: "close",
        seconds: 11,
      },
    ],
  },
];
