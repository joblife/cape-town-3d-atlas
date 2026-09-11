/**
 * Interface copy for Stap Kaap, the walkable miniature Cape Town. Every string
 * the walk UI shows that is not authored place content lives here, so the voice
 * stays in one place and can be read as a whole.
 */

export const COPY = {
  hero: {
    eyebrow: "CAPE TOWN, SOUTH AFRICA",
    headline: "Mini Cape Town 🇿🇦",
    enter: "Step into Cape Town",
    lines: [
      "Stap is Afrikaans for walk. That's the whole idea.",
      "A koeksister from the corner shop. A taxi up the hill. Lion's Head before the south-easter comes up.",
      "A little history around every corner.",
    ],
  },

  tagline: "A LITTLE CITY UNDER A BIG MOUNTAIN.",

  loading: [
    "Putting the kettle on…",
    "Checking whether the mountain's out…",
    "Waiting for the south-easter to drop…",
  ],

  chapters: [
    {
      n: "01",
      kicker: "EXPLORE",
      title: "Walk up to a landmark and read its story.",
      body: "Thirty-seven landmarks sit along these streets, from the Castle to a mosque on a slope, and each has a few minutes of story in it. Read one and it goes into your notebook.",
    },
    {
      n: "02",
      kicker: "GET AROUND",
      title: "Move through the streets at eye level.",
      body: "Walk with W A S D or the arrow keys and use the mouse to look around; Shift gets you there faster. The map and the globe are there when you want to jump back to a place you've already stood.",
    },
    {
      n: "03",
      kicker: "GUIDED WALKS",
      title: "Follow a route like a delivery run.",
      body: "Choose a guided walk and the city takes you from stop to stop, the current one always marked. Start with The Squeeze if you're new — it explains why the city is shaped the way it is.",
    },
    {
      n: "04",
      kicker: "A LOVE LETTER",
      title: "A small city worth knowing properly.",
      body: "Stap Kaap is for anyone who loves Cape Town, or is still deciding. It's a stylised miniature built from real map data and elevation — the streets are true, the scale isn't, and nothing here replaces standing in the actual place.",
    },
  ],

  controls: [
    { keys: "W A S D", label: "Walk — the arrow keys work too" },
    { keys: "Shift", label: "Run" },
    { keys: "E", label: "Read the story at a landmark" },
    { keys: "M", label: "Map" },
    { keys: "H", label: "Notebook" },
    { keys: "G", label: "Globe — see the whole city" },
    { keys: "Esc", label: "Close whatever's open" },
  ],

  notebook: {
    title: "THE STAP KAAP NOTEBOOK",
    heading: "Cape Town, page by page.",
    intro:
      "Every landmark you stop at gets a page: its story, its facts, and where the information came from. Read it again whenever you like.",
    emptyState:
      "Nothing in the notebook yet. Walk up to a landmark and press E to read your first story.",
    savedNote: "Your notebook is saved on this device.",
  },

  postcard: {
    lookCloser: "Look closer",
    story: "The story",
    facts: "Facts",
    timeline: "Timeline",
    visit: "If you go",
    sources: "Sources",
    photoCredit: "Photograph",
  },

  arrive: "Stop and read.",

  walkHint: "Press W, or the up arrow, to start walking.",

  controlsTitle: "Getting around",

  globeHint: "Pull back to see where you are",

  indexHeading: "Every landmark, in one place.",

  /** Shown on a card the first time a place is opened. */
  newStamp: "New — saved to your notebook.",

  /** Button on a landmark card that sends the walker there. */
  walkHere: "Walk me there",

  labels: {
    landmarks: "Landmarks",
    notebook: "Notebook",
    time: "Light",
  },

  honesty:
    "Built from real OpenStreetMap footprints and heights, and lit by the real sun at Cape Town's coordinates. It is a miniature, not a survey — the streets are true, the scale is generous, and nothing replaces standing in the place.",

  notebookExtra: {
    locked: "Not opened yet",
    goThere: "Go there",
    revisit: "Read again",
    clear: "Empty the notebook",
  },
} as const;
