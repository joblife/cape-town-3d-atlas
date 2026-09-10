import type { Place } from "./types.ts";

/** The south peninsula: Hout Bay, the cliff road, and the False Bay coast down to Cape Point. */
export const PLACES_PENINSULA: Place[] = [
  {
    id: "hout-bay",
    name: "Hout Bay",
    short: "Hout Bay",
    tagline: "A working harbour walled in by mountains",
    kind: "viewpoint",
    district: "peninsula-south",
    lon: 18.3476,
    lat: -34.0479,
    standfirst:
      "A fishing harbour pressed against the foot of a 331 m headland, with the Cape's oldest timber valley behind it. Hout Bay is still a working port, not a museum of one.",
    story: [
      "The Dutch named the place in 1652 for its forest, not its fish. Van Riebeeck's colony needed timber, and the wet valley behind the beach held the best yellowwood within reach, carried out over Constantia Nek for the Castle and the shipyards at Table Bay. Within a century and a half the accessible forest was gone. What replaced it was the sea: a German farmer, Jacob Trautmann, put up the first fishing village here in 1867, and the sheds his family built became the core of a harbour that still lands snoek and crayfish.",
      "The harbour was engineered rather than found. The south breakwater went in during 1937 and the north breakwater in 1968, and the quays between them now hold trawlers, yachts and a weekend market in an old processing shed. The bay itself is closed by The Sentinel, a 331 m headland whose cliff drops straight into the Atlantic, and by the ridge of Karbonkelberg behind it. Offshore, Duiker Island carries a Cape fur seal colony that boats visit in forty-minute runs.",
      "Not all of Hout Bay's history is maritime. Under the Group Areas Act the valley was zoned largely for white occupation, with the slope above the harbour left for coloured families; Hangberg and, later, Imizamo Yethu grew as the places where people who worked the boats were permitted to live. Imizamo Yethu was squeezed into 18 hectares and by the 2000s held an estimated 20,000 people. The Oceana fishmeal factory, for decades the source of a sulphur stench across the bay, closed in 2020.",
    ],
    facts: [
      { label: "Named by the VOC", value: "1652" },
      { label: "The Sentinel", value: "331 m" },
      { label: "Fishing village", value: "1867" },
      { label: "Breakwaters", value: "1937 & 1968" },
      { label: "Seal colony", value: "Duiker Island" },
      { label: "Road south", value: "Chapman's Peak Dr" },
    ],
    timeline: [
      {
        year: "1607",
        text: "John Chapman is sent ashore from the becalmed Consent; the bay is charted as Chapman's Chaunce, the first English place name on maps of southern Africa.",
      },
      {
        year: "1652",
        text: "Jan van Riebeeck records 't Houtbaaitjen and the valley becomes the young colony's main source of timber.",
      },
      {
        year: "1867",
        text: "Jacob Trautmann establishes a fishing village on the beach; curing snoek for export follows in the 1880s.",
      },
      {
        year: "1922",
        text: "Chapman's Peak Drive opens after seven years of convict labour, giving the valley a second road out.",
      },
      {
        year: "1937",
        text: "The south breakwater is completed; the north breakwater follows in 1968, enclosing the harbour.",
      },
    ],
    lookFor: [
      "The Sentinel's cliff, falling from 331 m straight into the sea at the western mouth of the bay.",
      "Kelp gulls and cormorants on the harbour wall, and seals hauled out on Duiker Island offshore.",
      "Hangberg, stacked on the slope between the harbour and the peak, right above the road.",
      "Snoek, hake and crayfish landed and iced on the quays early on a weekday morning.",
    ],
    practical: [
      { label: "Getting there", value: "M63 over Constantia Nek" },
      { label: "Best time", value: "Weekday mornings" },
      { label: "Boat trips", value: "40 min to Duiker Island" },
    ],
    camera: {
      hero: { lon: 18.348, lat: -34.047, zoom: 14.6, pitch: 63, bearing: 215 },
      context: { lon: 18.335, lat: -34.04, zoom: 11.7, pitch: 48, bearing: 190 },
      close: { lon: 18.3505, lat: -34.049, zoom: 16, pitch: 67, bearing: 250 },
    },
    tags: ["harbour", "fishing", "seals", "sentinel", "hangberg", "chapmans-peak"],
    wiki: "Hout Bay",
  },
  {
    id: "chapmans-peak-drive",
    name: "Chapman's Peak Drive",
    short: "Chapman's Peak",
    tagline: "Nine kilometres cut into a sea cliff",
    kind: "viewpoint",
    district: "peninsula-south",
    lon: 18.3625,
    lat: -34.0895,
    standfirst:
      "Nine kilometres of road blasted into a near-vertical sea cliff between Hout Bay and Noordhoek, built by convict labour in the 1910s and rebuilt behind steel catch fences after the rockfalls of the 1990s.",
    story: [
      "The road exists because of a geological contact. The base of Chapman's Peak is Cape granite, roughly 540 million years old; the summit is Table Mountain sandstone laid down much later on top of it. The old land surface between the two is exposed along this face, a junction that earth scientists travel here to see. The drive follows a contour on the granite, where the rock is most stable, and cuts back into softer sandstone and shale above.",
      "Construction began in 1915 from the Hout Bay side and a year later from Noordhoek, using convict labour. Surveyors worked the cliffs on hands and knees, and Sir Frederic de Waal, then Administrator of the Cape Province, insisted on the seaward line when his advisers called it impossible. The first section reached the lookout in 1919 and the finished road was opened on 6 May 1922 by Prince Arthur of Connaught. It took seven years.",
      "Rockfall was always the risk. After falls in the late 1990s, one of them fatal, the road was closed in January 2000 and a public-private concession was awarded to rebuild it. The route that reopened carries high-tensile catch fences anchored into the slope, rock netting, and concrete half-tunnels over the worst sections. Cars pay a toll, high wind can shut the gates, and the road is still a stage of the Cape Town Cycle Tour and the Two Oceans Marathon.",
    ],
    facts: [
      { label: "Built", value: "1915–1922" },
      { label: "Length", value: "9 km" },
      { label: "Curves", value: "114" },
      { label: "Summit above it", value: "593 m" },
      { label: "Official opening", value: "6 May 1922" },
      { label: "Reopened", value: "with catch fences" },
    ],
    timeline: [
      {
        year: "1607",
        text: "The peak is named for John Chapman, pilot of the English ship Consent, becalmed in Hout Bay.",
      },
      {
        year: "1915",
        text: "Work starts from the Hout Bay end, cut by hand and with explosives; the Noordhoek side begins in 1916.",
      },
      {
        year: "1919",
        text: "The first section, up to the lookout point, is opened to traffic.",
      },
      {
        year: "6 May 1922",
        text: "The completed drive is officially opened by Prince Arthur of Connaught, Governor-General of the Union.",
      },
      {
        year: "Jan 2000",
        text: "The road is closed indefinitely after rockfalls, one fatal, and a lawsuit.",
      },
      {
        year: "2004",
        text: "It reopens under a concession, with catch fences and half-tunnels, as a toll road.",
      },
    ],
    lookFor: [
      "The contact between pale Table Mountain sandstone above and grey Cape granite below, running along the face.",
      "Steel catch fences and their anchor cables above the road, and the concrete half-tunnels built to shed rock.",
      "Chapman's Point lookout, looking back across the water at The Sentinel and Hout Bay.",
      "The ruined manganese jetty below the old workings on the north-west slope of the peak.",
    ],
    practical: [
      { label: "Toll", value: "Paid at the gate" },
      { label: "Closures", value: "High wind or rockfall" },
      { label: "Best time", value: "Late afternoon" },
    ],
    camera: {
      hero: { lon: 18.3645, lat: -34.09, zoom: 15.2, pitch: 64, bearing: 190 },
      context: { lon: 18.36, lat: -34.07, zoom: 11.6, pitch: 47, bearing: 170 },
      close: { lon: 18.352, lat: -34.079, zoom: 16, pitch: 68, bearing: 255 },
    },
    tags: ["cliffs", "coastal-road", "engineering", "granite", "toll", "cycle-tour"],
    wiki: "Chapman's Peak",
  },
  {
    id: "muizenberg",
    name: "Muizenberg",
    short: "Muizenberg",
    tagline: "Where Cape Town learned to swim and surf",
    kind: "beach",
    district: "peninsula-south",
    lon: 18.471,
    lat: -34.1073,
    standfirst:
      "The beach where South Africa's railway age met the sea. Muizenberg was the country's first seaside resort, and its long, gentle break is now the most forgiving place in the country to learn to surf.",
    story: [
      "Muizenberg begins as a military outpost. The Dutch East India Company built Het Posthuys here in 1673, a year before the Castle in Cape Town was occupied, to watch the bay and tax farmers hauling produce to the ships in Simon's Bay. In August 1795 a small British force beat the Dutch garrison at the Battle of Muizenberg, opening the first British occupation of the Cape. Cannons from that fight still stand at Het Posthuys and on the station platform.",
      "The railway made the resort. The line from Cape Town, which had stopped at Wynberg for twenty years, was extended to Muizenberg in 1882, and after the Witwatersrand gold rush the village filled with holiday homes for the wealthy. Two pavilions followed, in 1911 and 1929, the second holding bathing cubicles, a tearoom and a 900-seat theatre; the beach in front of it was nicknamed the Snake Pit for the crowds. Rhodes kept a cottage on the seafront and died there in 1902.",
      "Surfing arrived in the 1910s, carried back from Hawaii, and the slow, shallow waves at Surfer's Corner made this the birthplace of the South African version of the sport. Agatha Christie took the train down from nursing duty to ride them. The resort faded in the 1970s and 1980s, then returned on the strength of those same waves: surf schools, board hire, a repaired pavilion, and a beachfront rebuild under way since 2025 that is replacing the eight surviving bathing boxes in the old colours and design.",
    ],
    facts: [
      { label: "Battle of Muizenberg", value: "7 Aug 1795" },
      { label: "Het Posthuys", value: "1673" },
      { label: "Railway arrived", value: "1882" },
      { label: "First pavilion", value: "1911" },
      { label: "Bathing boxes", value: "8, rebuilt 2026" },
      { label: "Surfing since", value: "1910s" },
    ],
    timeline: [
      {
        year: "1673",
        text: "The VOC builds Het Posthuys as a signal station, later a toll house on the road to Simon's Bay.",
      },
      {
        year: "7 Aug 1795",
        text: "The Battle of Muizenberg ends Dutch rule at the Cape and begins the first British occupation.",
      },
      {
        year: "1882",
        text: "The railway from Cape Town reaches the beach on 15 December, and the resort takes off.",
      },
      {
        year: "1911",
        text: "The first pavilion, built of wood, goes up on the beachfront.",
      },
      {
        year: "1929",
        text: "A second pavilion opens with bathing cubicles, a tearoom and a 900-seat theatre; it is demolished in 1970.",
      },
      {
        year: "2026",
        text: "The eight remaining bathing boxes are replaced during the beachfront rebuild, in the same colours.",
      },
    ],
    lookFor: [
      "The eight bathing boxes above the high-water mark, painted in flat blocks of colour.",
      "The shark-spotter flag on the beach and the spotters' lookout on the mountain behind the town.",
      "The Edwardian station and its clock tower, still working on the Southern Line.",
      "Longboarders at Surfer's Corner, riding the small, soft, wind-textured swell of False Bay.",
      "The line of cliffs above Muizenberg, where climbers work the shaded rock after rain.",
    ],
    practical: [
      { label: "Getting there", value: "Metrorail, 45 min" },
      { label: "Board hire", value: "Surfer's Corner" },
      { label: "Best time", value: "Early morning glass" },
    ],
    camera: {
      hero: { lon: 18.4745, lat: -34.1065, zoom: 15, pitch: 60, bearing: 190 },
      context: { lon: 18.465, lat: -34.1, zoom: 12.2, pitch: 50, bearing: 155 },
      close: { lon: 18.47, lat: -34.1075, zoom: 16.2, pitch: 66, bearing: 235 },
    },
    tags: ["surfing", "beach", "bathing-boxes", "railway", "false-bay", "resort"],
    wiki: "Muizenberg",
  },
  {
    id: "boulders-beach",
    name: "Boulders Beach",
    short: "Boulders Beach",
    tagline: "A penguin colony in a residential bay",
    kind: "nature",
    district: "peninsula-south",
    lon: 18.4524,
    lat: -34.1981,
    standfirst:
      "A mainland penguin colony that began with two pairs in 1982 and grew into one of the most visited wildlife sites in the country. Its numbers are falling again, and the story is as much about fish as about birds.",
    story: [
      "In 1982 a pair or two of African penguins nested on the granite shore south of Simon's Town, the first breeding recorded at this mainland site. They had food: commercial pelagic trawling had been restricted in False Bay, and sardines and anchovies came back inshore. Protected inside Table Mountain National Park and fenced off from the town, the colony multiplied through the 1980s and 1990s. At its peak, in the mid-2000s, counters recorded roughly 3,900 birds.",
      "The colony has since fallen back. The June 2026 census counted 790 breeding pairs, up from 698 the year before and well under half the level of the mid-2000s; colonies are counted in pairs because each pair raises one or two chicks a season. The cause is not the beach but the sea. Sardine and anchovy shoals have shifted east and south, and purse-seine fishing takes the same fish the penguins hunt. The African penguin was uplisted to Critically Endangered in 2024, with fewer than 10,000 breeding pairs left worldwide.",
      "Boulders is a rare case of penguins moving into a town rather than out of one. Boardwalks at Foxy Beach carry visitors to within a few metres of nesting birds and their guano-streaked rocks, where the birds bray like donkeys and squabble over shade. Two other mainland colonies survive in South Africa, at Stony Point and Betty's Bay, and neither is as easy to reach. The granite underfoot is around 540 million years old, part of the same Cape granite that underlies Chapman's Peak.",
    ],
    facts: [
      { label: "Colony since", value: "1982" },
      { label: "Founding pairs", value: "2" },
      { label: "Peak count", value: "~3,900 birds" },
      { label: "Pairs, 2026 census", value: "790" },
      { label: "Granite age", value: "540 million yrs" },
      { label: "Boardwalk", value: "Foxy Beach" },
    ],
    timeline: [
      {
        year: "1982",
        text: "The first breeding pairs nest between the granite boulders; there is no record of penguins here before this.",
      },
      {
        year: "1990s",
        text: "Protected as part of Table Mountain National Park, the colony grows year after year.",
      },
      {
        year: "mid-2000s",
        text: "Counts peak at roughly 3,900 birds in the bay.",
      },
      {
        year: "2024",
        text: "The African penguin is uplisted to Critically Endangered, with under 10,000 breeding pairs worldwide.",
      },
      {
        year: "2026",
        text: "The annual census records 790 breeding pairs at Boulders, up from 698 in 2025.",
      },
    ],
    lookFor: [
      "Penguins walking the boardwalk route at Foxy Beach, unbothered by people a few metres away.",
      "The braying call, closer to a donkey than a bird, used by pairs claiming a nest site.",
      "Granite boulders rounded by the sea, pale grey with black speckles and around 540 million years old.",
      "Chicks in the scrub above the high-water mark, guarded by an adult against gulls.",
      "Penguins porpoising in the cove, surfacing together and diving as a group.",
    ],
    practical: [
      { label: "Access", value: "SANParks boardwalk" },
      { label: "Best time", value: "Early morning" },
      { label: "Cost", value: "Conservation fee" },
      { label: "Swimming", value: "Beach 3, not the colony" },
    ],
    camera: {
      hero: { lon: 18.452, lat: -34.1975, zoom: 15, pitch: 62, bearing: 175 },
      context: { lon: 18.44, lat: -34.2, zoom: 12, pitch: 52, bearing: 160 },
      close: { lon: 18.4515, lat: -34.1972, zoom: 16.4, pitch: 67, bearing: 230 },
    },
    tags: ["penguins", "wildlife", "conservation", "sanparks", "false-bay", "granite"],
    wiki: "Boulders Beach",
    featured: true,
  },
  {
    id: "simons-town",
    name: "Simon's Town",
    short: "Simon's Town",
    tagline: "A naval base with a town around it",
    kind: "neighbourhood",
    district: "peninsula-south",
    lon: 18.4333,
    lat: -34.1932,
    standfirst:
      "A naval dockyard with a town attached, working since 1743. Most of the waterfront is still a base, and the town's history includes the communities apartheid moved off this shore.",
    story: [
      "Simon's Bay was the Dutch East India Company's winter anchorage. After gales wrecked ships in Table Bay in 1741, the Company built a dockyard and victualling station here in 1743, where vessels could take on water, firewood and provisions out of the north-west swell. Stone storehouses from that decade still stand on the seafront. The British took the bay after 1795, moved the Royal Navy's South African station here in the 1810s, and between 1900 and 1910 added an enclosed harbour, a breakwater and the Selborne dry dock.",
      "Control passed to South Africa under the Simonstown Agreement of 30 June 1955, and the Royal Navy handed over the base on 2 April 1957. The pact obliged South Africa to buy British warships and allowed the Royal Navy to keep using the dockyard; Britain terminated it on 16 June 1975, as arms embargoes and international opposition to apartheid made it untenable. Naval Base Simon's Town is now the South African Navy's headquarters and its largest base.",
      "The town around the base was not spared apartheid's zoning. Simon's Town and its neighbours were declared white areas, and families who had lived here for generations, among them the Muslim community whose history the town's heritage museum keeps, were moved out from the 1960s. Many were resettled at Ocean View, laid out in 1968 on the ridge above the town; Luyolo, a settlement of railway workers since 1901, was demolished. Land claims on the old plots continue.",
      "The railway reached Simon's Town in 1890 to serve the dockyard and still ends here, running along the shore where swells break against the line. On Jubilee Square a bronze Great Dane marks the town's strangest naval record: Just Nuisance, enlisted on 25 August 1939 after the railway threatened to put down the dog that kept riding the trains, and buried with full honours in 1944.",
    ],
    facts: [
      { label: "VOC station", value: "1743" },
      { label: "Royal Navy", value: "1810s–1957" },
      { label: "Railway reached", value: "1890" },
      { label: "Base handed over", value: "2 Apr 1957" },
      { label: "Martello tower", value: "1795–96" },
      { label: "Just Nuisance", value: "enlisted 1939" },
    ],
    timeline: [
      {
        year: "1743",
        text: "The VOC establishes a dockyard and victualling station at Simon's Bay as a winter anchorage.",
      },
      {
        year: "1795–96",
        text: "The British build a round Martello tower, still standing inside the naval base, now a small museum.",
      },
      {
        year: "1810s",
        text: "The Royal Navy moves its South African station from Cape Town to Simon's Town.",
      },
      {
        year: "1890",
        text: "The Southern Line reaches the town, largely to serve the dockyard, and terminates here.",
      },
      {
        year: "2 Apr 1957",
        text: "The Royal Navy hands the base to the South African Navy after the 1955 Simonstown Agreement.",
      },
      {
        year: "16 Jun 1975",
        text: "Britain terminates the Simonstown Agreement amid arms embargoes and opposition to apartheid.",
      },
    ],
    lookFor: [
      "The Selborne dry dock and the breakwater, built from stone quarried out of the mountain above the town.",
      "VOC storehouses on the seafront, the oldest surviving fabric of the yard.",
      "Just Nuisance's bronze statue at Jubilee Square, with a naval crest on his collar.",
      "The Southern Line running at the tide line, the only strip of land the railway could use.",
      "Dutch-period cannons and the round Martello tower inside the base perimeter.",
    ],
    practical: [
      { label: "Getting there", value: "Metrorail terminus" },
      { label: "Access", value: "Base is restricted" },
      { label: "Best time", value: "Weekdays" },
    ],
    camera: {
      hero: { lon: 18.4345, lat: -34.1925, zoom: 15.3, pitch: 62, bearing: 135 },
      context: { lon: 18.43, lat: -34.195, zoom: 12.4, pitch: 50, bearing: 120 },
      close: { lon: 18.4325, lat: -34.1935, zoom: 16.3, pitch: 66, bearing: 210 },
    },
    tags: ["navy", "harbour", "railway", "just-nuisance", "false-bay", "heritage"],
    wiki: "Simon's Town",
  },
  {
    id: "cape-point",
    name: "Cape Point & the Cape of Good Hope",
    short: "Cape Point",
    tagline: "A headland, not the end of Africa",
    kind: "nature",
    district: "peninsula-south",
    lon: 18.4978,
    lat: -34.3574,
    standfirst:
      "The corner of the continent, where the peninsula ends in two headlands and a lighthouse built twice. It is not Africa's southernmost point, and the two oceans do not visibly meet here.",
    story: [
      "In 1488 Bartolomeu Dias rounded this coast and named it Cabo das Tormentas, the Cape of Storms; the Portuguese crown renamed it Cabo da Boa Esperança, the Cape of Good Hope. The headland is a corner of the continent but not its end. Cape Agulhas lies about 150 km to the east-southeast and is the southernmost point of Africa as well as the official boundary between the Atlantic and Indian oceans. The water off Cape Point is a mixing zone, not a wall: the meeting of the cold Benguela and warm Agulhas systems shifts between Agulhas and this point, and there is no line in the sea.",
      "The first lighthouse was built 262 m above the water and lit on 1 May 1860. It stood too high. Ships rounding the point saw its beam early and steered in too close, and on 18 April 1911 the Portuguese liner Lusitania was wrecked on Bellows Rock on the south side of the point. The replacement, completed in 1919, stands at 87 m close to the sea, with a range of 63 km and the most powerful light on the South African coast. The Flying Dutchman Funicular, opened in 1996, climbs from the car park to the old tower, which now houses a monitoring station.",
      "The Cape of Good Hope section of Table Mountain National Park protects the southern tip of the peninsula and about a fifth of the park's area: sandstone fynbos, cliffs, seabird colonies, and a troop of chacma baboons that has learned to open car doors. Wind is the constant weather here, which is one reason the Global Atmosphere Watch runs an atmospheric research station on the point, sampling some of the cleanest air in the region.",
    ],
    facts: [
      { label: "Old lighthouse", value: "262 m, lit 1860" },
      { label: "New lighthouse", value: "87 m, 1919" },
      { label: "Light range", value: "63 km" },
      { label: "Funicular", value: "1996" },
      { label: "Cape Agulhas", value: "150 km east" },
      { label: "Dias rounded it", value: "1488" },
    ],
    timeline: [
      {
        year: "1488",
        text: "Bartolomeu Dias rounds the cape and calls it Cabo das Tormentas; it is later renamed the Cape of Good Hope.",
      },
      {
        year: "1 May 1860",
        text: "The old lighthouse, 262 m above the sea, is lit for the first time.",
      },
      {
        year: "18 Apr 1911",
        text: "The Portuguese liner Lusitania is wrecked on Bellows Rock, prompting a new light at sea level.",
      },
      {
        year: "1919",
        text: "The new lighthouse, 87 m above the water, is completed on the lower shelf of the point.",
      },
      {
        year: "1996",
        text: "The Flying Dutchman Funicular opens, carrying visitors up to the old lighthouse.",
      },
    ],
    lookFor: [
      "The two headlands: Cape Point itself and the Cape of Good Hope, about 2.3 km apart across a small bay.",
      "The old lighthouse on the ridge at the funicular's top station, and the working light on the lower shelf.",
      "Baboons on the road near the entrance, and the park's warnings about feeding them.",
      "Cape cormorants and gulls on the cliffs below the point, riding the updraught.",
      "Peninsula sandstone fynbos: restios, ericas and proteas holding thin soil on the slopes.",
    ],
    practical: [
      { label: "Access", value: "National park gate" },
      { label: "Funicular", value: "Separate ticket" },
      { label: "Weather", value: "Wind can close paths" },
      { label: "Getting there", value: "Drive from Simon's Town" },
    ],
    camera: {
      hero: { lon: 18.497, lat: -34.356, zoom: 14.6, pitch: 60, bearing: 165 },
      context: { lon: 18.46, lat: -34.32, zoom: 11.3, pitch: 46, bearing: 150 },
      close: { lon: 18.488, lat: -34.3525, zoom: 16.2, pitch: 67, bearing: 195 },
    },
    tags: ["lighthouse", "cape-of-good-hope", "fynbos", "shipwrecks", "ocean", "national-park"],
    wiki: "Cape Point",
    featured: true,
  },
];
