/**
 * Stap Kaap notebook metadata. One entry per place in PLACES, keyed by the
 * place id. Years are taken from each place's own timeline and facts.
 */

import type { StapMeta } from "./stap-types.ts";

export const STAP_META: Record<string, StapMeta> = {
  /* ── City Bowl ────────────────────────────────────────────────────── */
  "long-street": {
    year: "1652",
    caption: "Iron balconies from the 1890s, still in daily use.",
    stamp: "▦",
  },
  "companys-garden": {
    year: "1652",
    caption: "Sown in 1652; the old pear tree still fruits.",
    stamp: "❖",
  },
  "city-hall": {
    year: "1905",
    caption: "Mandela's first free speech, from the balcony.",
    stamp: "◆",
  },
  "castle-of-good-hope": {
    year: "1666",
    caption: "Five bastions of stone, raised between 1666 and 1679.",
    stamp: "⬢",
  },
  "district-six": {
    year: "1966",
    caption: "Names written on a floor map of streets that were razed.",
    stamp: "▩",
  },
  "greenmarket-square": {
    year: "1696",
    caption: "A slave market, then a produce market, then cobbles.",
    stamp: "▣",
  },
  "st-georges-cathedral": {
    year: "1901",
    caption: "Unfinished since 1901, and still holding services.",
    stamp: "✚",
  },
  parliament: {
    year: "1884",
    caption: "Victorian Gothic, gutted by fire in January 2022.",
    stamp: "◯",
  },

  /* ── Bo-Kaap ──────────────────────────────────────────────────────── */
  "bo-kaap": {
    year: "1760s",
    caption: "Cobbles, colour, and a community holding its ground.",
    stamp: "◈",
  },
  "auwal-mosque": {
    year: "1794",
    caption: "The country's first mosque, founded by an exile.",
    stamp: "✱",
  },
  "signal-hill": {
    year: "1806",
    caption: "Noon is fired from here, by hand, six days a week.",
    stamp: "◐",
  },

  /* ── Cape Flats ───────────────────────────────────────────────────── */
  langa: {
    year: "1927",
    caption: "Cape Town's oldest township, laid out in 1927.",
    stamp: "▤",
  },
  rondevlei: {
    year: "1952",
    caption: "230 birds, and the only hippos in Cape Town.",
    stamp: "≋",
  },

  /* ── Waterfront ───────────────────────────────────────────────────── */
  "va-waterfront": {
    year: "1860",
    caption: "First stone tipped into the bay on 17 September 1860.",
    stamp: "⇄",
  },
  "zeitz-mocaa": {
    year: "2017",
    caption: "Forty-two grain tubes, cut open into galleries.",
    stamp: "⬡",
  },
  "clock-tower": {
    year: "1882",
    caption: "The Port Captain's office, still keeping time.",
    stamp: "◉",
  },

  /* ── Green Point ──────────────────────────────────────────────────── */
  "cape-town-stadium": {
    year: "2010",
    caption: "Built for 2010, and still arguing about the bill.",
    stamp: "✶",
  },
  "green-point-lighthouse": {
    year: "1824",
    caption: "First lit in 1824, the oldest working light in the country.",
    stamp: "✦",
  },

  /* ── Atlantic seaboard ────────────────────────────────────────────── */
  "sea-point-promenade": {
    year: "1989",
    caption: "Five kilometres of sea wall, and a free outdoor gym.",
    stamp: "≋",
  },
  "clifton-beaches": {
    year: "1794",
    caption: "Four cold coves, each behind its own flight of steps.",
    stamp: "≋",
  },

  /* ── Camps Bay ────────────────────────────────────────────────────── */
  "camps-bay": {
    year: "1901",
    caption: "White sand under the Twelve Apostles' wall.",
    stamp: "≋",
  },
  "twelve-apostles": {
    year: "1820",
    caption: "Seventeen buttresses in a line, called the Twelve Apostles.",
    stamp: "▲",
  },

  /* ── Table Mountain ───────────────────────────────────────────────── */
  "table-mountain-cableway": {
    year: "1929",
    caption: "Five minutes to the top, and it has run since 1929.",
    stamp: "▲",
  },
  "platteklip-gorge": {
    year: "1503",
    caption: "The first recorded way up the mountain, in 1503.",
    stamp: "▲",
  },
  "lions-head": {
    year: "—",
    caption: "A spiral path, chains at the top, the best view.",
    stamp: "▲",
  },
  "maclears-beacon": {
    year: "1844",
    caption: "A pile of stones that helped measure the earth.",
    stamp: "▲",
  },

  /* ── Devil's Peak ─────────────────────────────────────────────────── */
  "devils-peak": {
    year: "1796",
    caption: "The King's Blockhouse of 1796 stands on the ridge.",
    stamp: "▲",
  },
  "rhodes-memorial": {
    year: "1912",
    caption: "Forty-nine granite steps, and a contested legacy.",
    stamp: "◆",
  },

  /* ── Southern suburbs ─────────────────────────────────────────────── */
  kirstenbosch: {
    year: "1913",
    caption: "Founded in 1913 for one country's plants.",
    stamp: "❖",
  },
  "newlands-forest": {
    year: "1650s",
    caption: "Pines, old forest, and the ruins of a stone zoo.",
    stamp: "❖",
  },

  /* ── Woodstock ────────────────────────────────────────────────────── */
  "old-biscuit-mill": {
    year: "1914",
    caption: "A 1914 biscuit factory, now a Saturday market.",
    stamp: "▣",
  },

  /* ── Peninsula south ──────────────────────────────────────────────── */
  "hout-bay": {
    year: "1652",
    caption: "Timber in 1652, fish since 1867, still a working port.",
    stamp: "≋",
  },
  "chapmans-peak-drive": {
    year: "1922",
    caption: "Nine kilometres cut into a granite sea cliff.",
    stamp: "⇄",
  },
  muizenberg: {
    year: "1882",
    caption: "The railway arrived in 1882 and the resort began.",
    stamp: "≋",
  },
  "boulders-beach": {
    year: "1982",
    caption: "A penguin colony that began with two pairs in 1982.",
    stamp: "✱",
  },
  "simons-town": {
    year: "1743",
    caption: "A naval dockyard with a town attached, since 1743.",
    stamp: "◯",
  },
  "cape-point": {
    year: "1860",
    caption: "Two headlands, two lighthouses, and the wind.",
    stamp: "▲",
  },
};
