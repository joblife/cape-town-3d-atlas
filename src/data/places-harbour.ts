import type { Place } from "./types.ts";

export const PLACES_WATERFRONT: Place[] = [
  {
    id: "va-waterfront",
    name: "V&A Waterfront",
    short: "V&A Waterfront",
    tagline: "A Victorian harbour that became a city's front door",
    kind: "market",
    district: "waterfront",
    lon: 18.4206,
    lat: -33.9035,
    standfirst:
      "Cape Town's harbour was dredged and blasted out of Table Bay in the 1860s, and the old basins are now the most visited address in the country. The fishing fleet and the repair yards still work here, which is what keeps the place from feeling like a set.",
    story: [
      "In June 1858 a winter gale drove more than thirty ships ashore at Table Bay, and Lloyd's of London stopped insuring vessels that wintered there. The colony's answer was an artificial harbour. On 17 September 1860 Prince Alfred, Queen Victoria's fourteen-year-old son, tipped the first load of stone into the water, and the Alfred Basin took shape under convict labour. The larger Victoria Basin followed in the 1890s, when gold and diamond traffic outgrew the first basin.",
      "By the middle of the twentieth century container ships had moved to Duncan Dock, and the old basins were derelict. In November 1988 Transnet set up a company to redevelop them, and the Victoria Wharf complex opened around the same time. The formula, borrowed from Baltimore and Boston, was to keep the working water and sell the atmosphere around it. It has been copied across the continent since, rarely as well.",
      "What separates this from a mall with a harbour attached is the work still going on. Crayfish and hake boats tie up on the fishing quays; the Robinson Dry Dock of 1882 still lifts vessels for hull repairs; tugs, chandlers and marine engineers occupy the less decorative edges. Walk past the restaurants towards the repair quay and the soundtrack changes from buskers to angle grinders.",
      "The Waterfront reports around 24 million visits a year, which makes it the busiest destination in the country, and in late December the walkways are shoulder to shoulder. The land behind it belongs to the state through Transnet; the company holds a long lease and runs the place for profit. The old dock housing is mostly gone, and the fishing fleet works a shrinking strip of quay. The success and the cost come out of the same deal.",
    ],
    facts: [
      { label: "First stone", value: "17 Sep 1860" },
      { label: "Robinson Dry Dock", value: "1882" },
      { label: "Reopened as V&A", value: "November 1988" },
      { label: "Reported visits", value: "About 24 million" },
      { label: "Site area", value: "123 hectares" },
      { label: "Working quays", value: "Fishing, repair" },
    ],
    timeline: [
      {
        year: "1858",
        text: "A June gale drives more than thirty ships ashore at Table Bay, and Lloyd's refuses to insure vessels wintering there.",
      },
      {
        year: "1860",
        text: "Prince Alfred tips the first stone on 17 September and work begins on the Alfred Basin.",
      },
      {
        year: "1882",
        text: "The Robinson Dry Dock opens for ship repair; the Clock Tower follows the same year.",
      },
      {
        year: "1890s",
        text: "The Victoria Basin is cut to handle the gold and diamond traffic flooding into Table Bay.",
      },
      {
        year: "1988",
        text: "A Transnet company is formed to redevelop the derelict docklands; the first shops open in November.",
      },
      {
        year: "2019",
        text: "A wider swing bridge replaces the 1997 original between the Alfred and Victoria basins.",
      },
    ],
    lookFor: [
      "The granite blocks of the Alfred Basin wall, laid by convict labour in the 1860s.",
      "The swing bridge turning on its pivot, opened for boats through the day.",
      "Hake and crayfish boats on the fishing quay, and the ice plant that serves them.",
      "The ship lift at the Robinson Dry Dock, still raising hulls after 140 years.",
      "Table Mountain framed at the end of the quay, seen from the north side of the basin.",
    ],
    practical: [
      { label: "Getting there", value: "MyCiTi 104 bus" },
      { label: "Cost", value: "Free to enter" },
      { label: "Best time", value: "Weekday mornings" },
      { label: "Parking", value: "Paid, fills early" },
    ],
    camera: {
      hero: { lon: 18.42, lat: -33.904, zoom: 14.9, pitch: 62, bearing: 160 },
      context: { lon: 18.4185, lat: -33.9025, zoom: 12.7, pitch: 54, bearing: 145 },
      close: { lon: 18.4206, lat: -33.9035, zoom: 16.9, pitch: 68, bearing: 205 },
    },
    tags: ["harbour", "shopping", "working port", "victoria basin", "food", "history"],
    wiki: "V&A Waterfront",
    featured: true,
  },
  {
    id: "zeitz-mocaa",
    name: "Zeitz MOCAA",
    short: "Zeitz MOCAA",
    tagline: "A grain silo carved into a museum",
    kind: "museum",
    district: "waterfront",
    lon: 18.423,
    lat: -33.9084,
    standfirst:
      "A 1921 grain silo, once the tallest building in the country, now holds the largest museum of contemporary art from Africa and its diaspora. Heatherwick Studio cut the galleries out of its concrete tubes rather than demolishing them.",
    story: [
      "The grain silo complex went up in 1921 and took about three years to finish. At 57 metres it was the tallest building in South Africa for decades: a stack of 42 concrete tubes, filled from the quay where grain arrived by ship and lifted through a central shaft. It worked until 1990, then stood derelict while the Waterfront grew up around it. It was a city landmark long before anyone proposed a museum inside it.",
      "Heatherwick Studio chose not to gut the tubes. It carved a single central atrium out of them, a void shaped on a scaled-up grain of corn, cutting through the concrete so that the circular tube ends remain exposed as the walls of galleries. The cut faces were polished, and the reinforcement behind them is new. Where grain once fell, visitors now stand in a chamber 27 metres high that is neither the old building nor a new one, but a section through both.",
      "Above the atrium the roof is set with faceted glass panels, cushioned rather than flat, so daylight drops into the void and the mountain is refracted through them. Nine floors hold about 6,000 square metres of exhibition space in 80 galleries, with a rooftop sculpture garden and a restaurant above. The museum opened on 22 September 2017.",
      "Zeitz MOCAA draws on the Zeitz Collection and runs the BMW Centre for Art Education on its lower floors. It has also been criticised as an expensive annexe of a shopping district: general admission runs to R350, with a R199 walk-in rate for African citizens and free entry for African passport holders on Wednesday mornings. The galleries are among the best in the hemisphere; the question of who gets to use them is still open.",
    ],
    facts: [
      { label: "Silo built", value: "1921-1924" },
      { label: "Silo tubes", value: "42" },
      { label: "Silo height", value: "57 m" },
      { label: "Opened", value: "22 September 2017" },
      { label: "Gallery space", value: "6,000 sq m" },
      { label: "Galleries", value: "80" },
    ],
    timeline: [
      {
        year: "1921",
        text: "Construction starts on the grain silo complex at the harbour; it is completed around 1924.",
      },
      {
        year: "1990",
        text: "Milling and storage end, and the silo is left standing empty as the harbour changes around it.",
      },
      {
        year: "2017",
        text: "Zeitz MOCAA opens on 22 September after Heatherwick Studio's conversion.",
      },
    ],
    lookFor: [
      "The tube ends left exposed in the gallery walls, each one a segment of a circle.",
      "The polished cut of the atrium, ground smooth from the raw concrete.",
      "The pillowed glass above the void, with Table Mountain warped in the panels.",
      "Darker patches of grain staining that survived the cleaning.",
      "The lift core that once carried grain, now carrying people.",
    ],
    practical: [
      { label: "Getting there", value: "Silo District, V&A" },
      { label: "Tickets", value: "R350 online" },
      { label: "African citizens", value: "R199 on site" },
      { label: "Free entry", value: "Wed 10am-1pm" },
    ],
    camera: {
      hero: { lon: 18.4228, lat: -33.9086, zoom: 15.7, pitch: 65, bearing: 212 },
      context: { lon: 18.424, lat: -33.906, zoom: 13.3, pitch: 56, bearing: 195 },
      close: { lon: 18.423, lat: -33.9084, zoom: 17, pitch: 68, bearing: 250 },
    },
    tags: ["museum", "contemporary art", "architecture", "silo", "heatherwick", "gallery"],
    wiki: "Zeitz Museum of Contemporary Art Africa",
  },
  {
    id: "clock-tower",
    name: "The Clock Tower & Victoria Basin",
    short: "The Clock Tower",
    tagline: "The harbour's red sentry, still keeping time",
    kind: "landmark",
    district: "waterfront",
    lon: 18.4222,
    lat: -33.9065,
    standfirst:
      "Built in 1882 as the Port Captain's office, the three-storey tower watched every ship that entered Table Bay Harbour and kept the tide readings that told it when to sail. It lost the job in 1904 and got it back, as a monument, in the 1990s.",
    story: [
      "For eighteen years the whole of Table Bay Harbour was run from this tower. The Port Captain's office sat at the top, above a clock mechanism imported from Edinburgh. The second floor was lined with mirrors so that he could watch both basins by moving his eyes rather than his feet. In the ground floor a well housed the tidal gauge, the instrument that told pilots what the water was doing at the harbour mouth.",
      "The tower went up in 1882, the year the Robinson Dry Dock opened, when the Alfred Basin was barely two decades old and the Victoria Basin was being cut behind it. It was built in the Gothic style the Public Works Department favoured for harbour buildings: pointed windows, a steep roof, and a clock face big enough to be read from the quay. Painted red and grey, it was visible from every berth.",
      "By 1904 the port had outgrown the building and the Port Captain moved across the Cut to the Pierhead. The tower was repainted, put to other uses, and forgotten; by the 1970s it was leaning about 50 mm. It was declared a national monument on 4 August 1978, and in the late 1990s Gwen and Gawie Fagan restored it, scraping back the paint layers to recover the original red and arresting the lean.",
      "The basin around it is now the busiest part of the old harbour. The Nelson Mandela Gateway to Robben Island stands a short walk away, the swing bridge opens for boats, and the quay that once handled mail ships takes tour boats and ferries. The tower itself holds shops and offices, and the clock still runs. Its working life as a signal station lasted twenty-two years; its life as a landmark has lasted far longer.",
    ],
    facts: [
      { label: "Built", value: "1882" },
      { label: "Storeys", value: "Three" },
      { label: "Clock", value: "From Edinburgh" },
      { label: "Port Captain", value: "1882-1904" },
      { label: "Monument", value: "4 Aug 1978" },
      { label: "Arrested lean", value: "About 50 mm" },
    ],
    timeline: [
      {
        year: "1882",
        text: "The tower is completed as the Port Captain's office and signal station for Table Bay Harbour.",
      },
      {
        year: "1904",
        text: "The port administration moves to the Pierhead across the Cut and the tower is left behind.",
      },
      {
        year: "1978",
        text: "Declared a national monument on 4 August.",
      },
      {
        year: "1990s",
        text: "Gwen and Gawie Fagan restore the building and recover its original red paint.",
      },
      {
        year: "2019",
        text: "The new swing bridge opens beside it, linking the two basins for pedestrians.",
      },
    ],
    lookFor: [
      "The clock face, still working, set into the red and grey Gothic front.",
      "Pointed windows and the steep roof, unusual dress for a working dock.",
      "The depth of the red, matched to the original from paint scrapings.",
      "The sealed housing of the old tidal gauge at ground level.",
      "The swing bridge pivot, and the boats queued for its opening.",
    ],
    practical: [
      { label: "Getting there", value: "V&A, near gateway" },
      { label: "Robben Island", value: "Ferries alongside" },
      { label: "Cost", value: "Free to view" },
      { label: "Best time", value: "Late afternoon" },
    ],
    camera: {
      hero: { lon: 18.4222, lat: -33.9065, zoom: 16.2, pitch: 64, bearing: 186 },
      context: { lon: 18.4195, lat: -33.9045, zoom: 13.1, pitch: 55, bearing: 155 },
      close: { lon: 18.4222, lat: -33.9065, zoom: 17, pitch: 67, bearing: 120 },
    },
    tags: ["harbour", "victorian", "gothic", "heritage", "robben island"],
    wiki: "Port of Cape Town",
  },
];

export const PLACES_GREEN_POINT: Place[] = [
  {
    id: "cape-town-stadium",
    name: "Cape Town Stadium",
    short: "Cape Town Stadium",
    tagline: "A World Cup bowl the city is still paying for",
    kind: "sport",
    district: "green-point",
    lon: 18.4111,
    lat: -33.9035,
    standfirst:
      "Built in three years for the 2010 World Cup at a cost of about R4.4 billion, the stadium held 64,100 seats in its tournament configuration. Sixteen years on it is busy, subsidised, and still arguing with the city about who pays.",
    story: [
      "Construction began in March 2007 on Green Point Common, on land that had been public park and part of the Metropolitan Golf Club, the country's oldest course on one site. The design by gmp Architekten, with Louis Karol and the engineers Schlaich Bergermann, was finished in December 2009: a shallow bowl under a cable-net roof carrying 9,000 glass panels and a membrane skin that holds crowd noise in and keeps the southeaster out.",
      "The stadium cost about R4.4 billion. The 2010 tournament brought eight matches, including the semi-final on 6 July when the Netherlands beat Uruguay 3-2 in front of 62,479 people. Three group games drew the full tournament capacity of 64,100. For five weeks the building worked exactly as designed, and the city spent the same five weeks promising itself that it would not become a white elephant.",
      "The company that was to operate it, Sail Stadefrance, walked away from a thirty-year lease within months of the final. For more than a decade the municipality covered annual operating losses of roughly R40 million to R55 million. Zoning and the parkland setting limited the commercial development that might have paid the bills, and the stadium had no regular tenant. It was not useless; it was a large, well-built building with nothing to do on a Wednesday.",
      "The Cape Town Sevens arrived in 2015 and gave it one big weekend a year. In 2021 Western Province and the Stormers moved their home fixtures from Newlands and DHL took the naming rights, and concerts, expos and cycle tours now fill much of the calendar. The subsidy has fallen without disappearing, and the city is debating how much of the Common around it can be built on to close the gap.",
    ],
    facts: [
      { label: "Completed", value: "December 2009" },
      { label: "2010 capacity", value: "64,100" },
      { label: "Cost", value: "About R4.4bn" },
      { label: "Roof", value: "9,000 glass panels" },
      { label: "Annual subsidy", value: "R40m to R55m" },
      { label: "Anchor tenants", value: "Stormers, 2021" },
    ],
    timeline: [
      {
        year: "2007",
        text: "Construction begins in March on Green Point Common, taking in part of the Metropolitan Golf Club's land.",
      },
      {
        year: "2009",
        text: "The stadium is completed in December, three months before the tournament.",
      },
      {
        year: "2010",
        text: "Eight World Cup matches are played here, ending with the semi-final on 6 July.",
      },
      {
        year: "2010",
        text: "The private operator withdraws from its thirty-year lease within months of the final.",
      },
      {
        year: "2015",
        text: "Cape Town hosts its first leg of the World Rugby Sevens Series.",
      },
      {
        year: "2021",
        text: "The Stormers move in from Newlands and DHL takes the naming rights.",
      },
    ],
    lookFor: [
      "The suspended roof: 9,000 glass panels on a cable net, with no columns inside the bowl.",
      "The membrane skin on the outer shell, lit from within on match nights.",
      "Green Point Common around the stands, still grass and still public.",
      "Signal Hill and Lion's Head above the north stand, close enough to seem overhead.",
      "The open side of the bowl, where the southeaster hits first.",
    ],
    practical: [
      { label: "Getting there", value: "MyCiTi, then walk" },
      { label: "Typical capacity", value: "About 55,000" },
      { label: "Tours", value: "Non-match days" },
      { label: "Best time", value: "Match nights" },
    ],
    camera: {
      hero: { lon: 18.4111, lat: -33.9035, zoom: 15.3, pitch: 66, bearing: 142 },
      context: { lon: 18.406, lat: -33.9, zoom: 12.9, pitch: 57, bearing: 125 },
      close: { lon: 18.4111, lat: -33.9035, zoom: 16.8, pitch: 68, bearing: 235 },
    },
    tags: ["football", "rugby", "stadium", "2010 world cup", "green point", "concerts"],
    wiki: "Cape Town Stadium",
  },
  {
    id: "green-point-lighthouse",
    name: "Green Point Lighthouse",
    short: "Green Point Light",
    tagline: "The country's oldest working lighthouse",
    kind: "landmark",
    district: "green-point",
    lon: 18.3999,
    lat: -33.9014,
    standfirst:
      "First lit on 12 April 1824, this is the oldest operational lighthouse in South Africa. It stands on the rocks at Mouille Point because sailing ships kept finding them in the dark.",
    story: [
      "Table Bay was one of the most dangerous anchorages on the route to the East: open to the north-west swell, with rocks off Green Point and Mouille Point waiting for ships that misjudged the approach. In 1821 the acting governor, Sir Rufane Donkin, started a masonry tower without waiting for permission from London. Work began on 14 September under Herman Schutte, and the light was first shown on 12 April 1824.",
      "The first lamp burned sperm whale oil in an Argand burner and could be seen about six nautical miles out. The tower was raised to its present 16 metres in 1865, putting the light roughly 20 metres above high water. Its red and white diagonal stripes are a day mark, painted so the tower can be identified in daylight before any light is visible.",
      "Fog, not darkness, was the bigger danger on this coast. A fog signal was installed in 1926, sounding for three seconds in every thirty; residents called it Moaning Minnie and signed petitions against it. In 1986 it was replaced by a quieter electric nautophone closer to the seawall. The original diaphone survives at the site, and the ground floor holds a small museum of lighthouse equipment.",
      "The light is automated now and monitored from elsewhere, and the building also serves as the head office of South Africa's lighthouse service. The tower stands at the edge of Green Point's open ground, between the golf course, the promenade and a short, rocky shoreline. The walk from it to Sea Point is the most heavily used stretch of coast in the city, and this is one of the few lighthouses in the country that visitors can enter.",
    ],
    facts: [
      { label: "First lit", value: "12 April 1824" },
      { label: "Tower height", value: "16 m" },
      { label: "Focal plane", value: "About 20 m" },
      { label: "Fog signal", value: "1926-1986" },
      { label: "Paint", value: "Red and white" },
      { label: "Status", value: "Oldest in SA" },
    ],
    timeline: [
      {
        year: "1821",
        text: "Construction begins on 14 September under Herman Schutte, on the orders of acting governor Sir Rufane Donkin.",
      },
      {
        year: "1824",
        text: "The light is first shown on 12 April, burning sperm whale oil.",
      },
      {
        year: "1865",
        text: "The tower is raised to its present 16 metres, lifting the light about 20 metres above high water.",
      },
      {
        year: "1926",
        text: "A fog signal is installed; its blasts earn it the name Moaning Minnie.",
      },
      {
        year: "1986",
        text: "The diaphone is retired and replaced by an electric nautophone on the seawall.",
      },
    ],
    lookFor: [
      "The diagonal red and white stripes, a day mark rather than decoration.",
      "The square masonry tower, raised in stages, with the join still visible.",
      "The diaphone and other fog signal equipment kept in the ground floor museum.",
      "The rocks off Mouille Point that the light was built to warn ships away from.",
      "The line of the promenade heading south towards Sea Point.",
    ],
    practical: [
      { label: "Getting there", value: "Mouille Point" },
      { label: "Tours", value: "Check times first" },
      { label: "Cost", value: "Small entry fee" },
      { label: "Best time", value: "Morning" },
    ],
    camera: {
      hero: { lon: 18.3999, lat: -33.9014, zoom: 16.4, pitch: 63, bearing: 118 },
      context: { lon: 18.397, lat: -33.899, zoom: 13.4, pitch: 54, bearing: 150 },
      close: { lon: 18.3999, lat: -33.9014, zoom: 16.9, pitch: 68, bearing: 70 },
    },
    tags: ["lighthouse", "maritime", "heritage", "mouille point", "fog signal"],
    wiki: "Green Point Lighthouse, Cape Town",
  },
];

export const PLACES_ATLANTIC: Place[] = [
  {
    id: "sea-point-promenade",
    name: "Sea Point Promenade",
    short: "Sea Point Promenade",
    tagline: "Five kilometres where the city comes to walk",
    kind: "neighbourhood",
    district: "atlantic-seaboard",
    lon: 18.3863,
    lat: -33.9152,
    standfirst:
      "The promenade is not a beach. It is a concrete sea wall, a free public gym, a run of tidal pools and a five-kilometre argument about who the Atlantic seaboard belongs to, and most evenings it is the busiest public space in the city.",
    story: [
      "The path runs about five kilometres from the Mouille Point lighthouse to the rocks at Bantry Bay, laid along a sea wall built to stop the Atlantic eating the road behind it. The wall has been repaired in phases since 2015, then again in a R41 million project that finished at the end of 2024. What it protects is a dense strip of flats, hotels and shops on the narrow shelf between Main Road and the water.",
      "On a weekday morning there are swimmers at Milton Beach and the Pavilion pool, runners and cyclists on their marked lanes, and a crowd at the outdoor gym near Three Anchor Bay, which is free and permanently busy. At sunset the population changes. It is the nearest thing Cape Town has to a village green, except that it is five kilometres long and faces the coldest water in the city.",
      "Sea Point is the most densely built part of the Atlantic seaboard and the least uniform. Behind the promenade's towers are blocks from the 1960s with tenants who have held flats for decades, a long-standing Jewish community, Portuguese and Congolese families, and newer arrivals from Zimbabwe and the Eastern Cape. It is also gentrifying quickly: short-let apartments, and sea-facing floors sold to owners who are away for the winter.",
      "Under apartheid this was a whites-only place, like most of the city's coast. In August and September 1989 the Mass Democratic Movement staged protests along the seaboard, and Desmond Tutu led a crowd onto a restricted beach to picnic and swim. The beaches were opened to all races soon afterwards. The pools people use now are the same ones that were closed to most Capetonians then.",
    ],
    facts: [
      { label: "Length", value: "About 5 km" },
      { label: "Sea wall works", value: "2015-2024" },
      { label: "Latest upgrade", value: "R41 million" },
      { label: "Tidal pools", value: "Milton, Saunders" },
      { label: "Outdoor gym", value: "Free to use" },
      { label: "Beaches", value: "Segregated to 1989" },
    ],
    timeline: [
      {
        year: "1910",
        text: "Graaff's Pool is built for a private family; it later passes to the city and is opened to the public.",
      },
      {
        year: "1953",
        text: "The Reservation of Separate Amenities Act places the city's beaches and pools under racial segregation.",
      },
      {
        year: "1989",
        text: "Beach protests led by the Mass Democratic Movement break the whites-only rule; the beaches are opened to all races.",
      },
      {
        year: "2015",
        text: "The first phase of the sea wall and promenade rebuild is completed between Three Anchor Bay and Mouille Point.",
      },
      {
        year: "2024",
        text: "A R41 million rehabilitation of the sea wall, stairs and Granger Bay precinct finishes.",
      },
    ],
    lookFor: [
      "The sea wall's patched concrete, several generations of repair in one face.",
      "The free outdoor gym near Three Anchor Bay, in use from before sunrise.",
      "Swimmers in wetsuits at Milton Beach, and the pavilion pool above them.",
      "Public art along the wall, which the city and its sponsors rotate every few years.",
      "The profile of Lion's Head and the Apostles across the bay, between the blocks.",
    ],
    practical: [
      { label: "Getting there", value: "MyCiTi 104 or 105" },
      { label: "Best time", value: "Sunrise or sunset" },
      { label: "Swimming", value: "Wetsuit advised" },
      { label: "Cost", value: "Free" },
    ],
    camera: {
      hero: { lon: 18.3872, lat: -33.914, zoom: 13.8, pitch: 57, bearing: 198 },
      context: { lon: 18.396, lat: -33.907, zoom: 12.3, pitch: 50, bearing: 188 },
      close: { lon: 18.3862, lat: -33.9152, zoom: 16.5, pitch: 63, bearing: 238 },
    },
    tags: ["promenade", "atlantic", "tidal pools", "running", "public space"],
    wiki: "Sea Point",
  },
  {
    id: "clifton-beaches",
    name: "Clifton",
    short: "Clifton Beaches",
    tagline: "Four cold coves under the cliff",
    kind: "beach",
    district: "atlantic-seaboard",
    lon: 18.3754,
    lat: -33.9403,
    standfirst:
      "Clifton is four beaches in a line, divided by granite boulders and reached by a separate flight of steps for each. The water sits between 12 and 16 degrees, the wind is blocked by the mountain, and the houses above are the most expensive in the country.",
    story: [
      "The four coves run north to south from First to Fourth, tucked under the seaward face of Lion's Head. Granite boulders the size of houses separate them, the sand is white quartz and shell, and each beach has its own steep flight of steps down from Victoria Road. The slope above blocks the southeaster, which is why Clifton can be still and warm when Camps Bay, a few kilometres south, is being sandblasted.",
      "The water comes up from the Antarctic on the Benguela current and sits between 12 and 16 degrees, though the summer southeaster pushes the warm top layer offshore and can take it below 10. Swims are measured in minutes, not lengths. Fourth Beach is the largest, with lifeguards in season and Blue Flag status; Third is the smallest and has long been a gay beach; Second draws students and volleyball; First is quiet, with the strongest surf. There is no boardwalk, no shop on the sand, and very little parking.",
      "In 1794 a Portuguese slave ship, the São José Paquete Africa, struck a rock about 100 metres off this beach with more than 400 enslaved Mozambicans aboard; more than 200 drowned and the survivors were sold in Cape Town. The land above had been called Skoenmakers Gat, after a ship deserter who lived in a cave over Second Beach, and the cove took the name Clifton only at the end of the nineteenth century.",
      "In the 1920s the city laid out small plots for soldiers returning from the First World War, and the first bungalows were built from packing cases that had carried imported motor cars; the leases became freehold in the 1990s. Clifton was a white area under the Group Areas Act, and its beaches worked as whites-only places even where no sign said so, because the buses and the suburb did not admit anyone else. The protests of 1989 broke that open. What replaced the legal barrier was a price barrier: the sand is public, and in December it fills with people who came by minibus and walked down the steps.",
    ],
    facts: [
      { label: "Beaches", value: "Four coves" },
      { label: "Water", value: "12 to 16 °C" },
      { label: "Wind shelter", value: "Lion's Head" },
      { label: "Slave ship wreck", value: "1794" },
      { label: "Blue Flag", value: "Fourth Beach" },
      { label: "Access", value: "Steps only" },
    ],
    timeline: [
      {
        year: "1794",
        text: "The Portuguese slave ship São José Paquete Africa is wrecked off the beach; more than 200 of the enslaved Mozambicans aboard drown and the survivors are sold in Cape Town.",
      },
      {
        year: "1920s",
        text: "The city lays out small plots for soldiers returning from the First World War, and the first bungalows are built from packing cases used to ship imported cars.",
      },
      {
        year: "1989",
        text: "Coastal protests break the whites-only rule that had kept most Capetonians off the beach.",
      },
      {
        year: "1990s",
        text: "The bungalow leases are converted to freehold, and the cove becomes the most expensive address in Africa.",
      },
    ],
    lookFor: [
      "The granite boulders and the white quartzite sand between them.",
      "Moses Beach, above First, which appears and disappears as the sand moves.",
      "The bungalows on Fourth Beach, built hard against the sand from old packing cases.",
      "The gap between Lion's Head and the sea that funnels the wind away from the coves.",
      "Sunset behind Robben Island, seen from the middle of Fourth Beach.",
    ],
    practical: [
      { label: "Getting there", value: "Steps from road" },
      { label: "Parking", value: "Scarce in summer" },
      { label: "Water", value: "12 to 15 °C" },
      { label: "Best time", value: "Early morning" },
    ],
    camera: {
      hero: { lon: 18.3757, lat: -33.9405, zoom: 14.6, pitch: 61, bearing: 104 },
      context: { lon: 18.369, lat: -33.9385, zoom: 12.8, pitch: 52, bearing: 92 },
      close: { lon: 18.3754, lat: -33.9403, zoom: 16.9, pitch: 68, bearing: 58 },
    },
    tags: ["beach", "swimming", "atlantic", "sunset", "granite", "steps"],
    wiki: "Clifton, Cape Town",
  },
];

export const PLACES_CAMPS_BAY: Place[] = [
  {
    id: "camps-bay",
    name: "Camps Bay Beach",
    short: "Camps Bay",
    tagline: "White sand under the Apostles' wall",
    kind: "beach",
    district: "camps-bay",
    lon: 18.3777,
    lat: -33.9509,
    standfirst:
      "A long white beach with a palm-lined road behind it and the Twelve Apostles standing over it, Camps Bay was a fishing bay that became a resort the moment the tram arrived in 1901.",
    story: [
      "The first people recorded here were San hunter-gatherers and Goringhaikona Khoi pastoralists, who were pushed off the Table Mountain slopes by Dutch settlers and confined to Camps Bay in 1657. Measles and smallpox cut the community down by 1713, leaving a single kraal, Oudekraal. The bay later took its name from Frederik von Kamptz, who married the widow of the landowner Johan Wernich in 1778.",
      "For most of the nineteenth century the bay stayed isolated, reached only by a track. In 1884 Thomas Bain was commissioned to build a road from Sea Point using convict labour; it was finished in 1887 and named Victoria Road for Queen Victoria's jubilee. In 1901 the Mills Syndicate ran an electric tram through Sea Point to the bay, and in 1902 a second line came over Kloof Nek. Day trippers arrived by the thousand.",
      "The syndicate built a power station, now the Theatre on the Bay, and stone cottages for its drivers on Geneva Drive, while the beach acquired a tidal pool, a pavilion and the row of palms along Victoria Road that gives the place its look. The trams stopped running in 1930, and the resort slowly became a residential suburb, then a restaurant strip, then one of the most expensive addresses on the Atlantic seaboard. The beach itself has not changed much: sand between two granite headlands, a rock pool at the northern end, lifeguards in summer, and the Twelve Apostles standing directly behind the town.",
      "The bay faces west and takes the full sunset, and in winter it takes the north-west swell, which closes the beach when the surf runs high. In summer the southeaster can make the sand unpleasant by mid-afternoon. Parking along Victoria Road is the standing difficulty. At the southern end, steps lead down to Bakoven's smaller coves, which are rockier, quieter and harder to find.",
    ],
    facts: [
      { label: "First residents", value: "Khoi and San" },
      { label: "Confined here", value: "1657" },
      { label: "Named for", value: "Von Kamptz, 1778" },
      { label: "Tram arrived", value: "1901" },
      { label: "Blue Flag", value: "Since 2008" },
      { label: "Backdrop", value: "Twelve Apostles" },
    ],
    timeline: [
      {
        year: "1657",
        text: "The Goringhaikona Khoi lose their grazing land to Dutch settlers and are confined to Camps Bay.",
      },
      {
        year: "1713",
        text: "Measles and smallpox reduce the settlement to a single kraal, Oudekraal.",
      },
      {
        year: "1778",
        text: "Frederik von Kamptz marries the widow of the landowner Johan Wernich, and the bay takes his name.",
      },
      {
        year: "1887",
        text: "Thomas Bain's Victoria Road is completed and opens the bay to day visitors.",
      },
      {
        year: "1901",
        text: "The electric tram from Sea Point reaches Camps Bay and the resort era begins.",
      },
      {
        year: "1930",
        text: "The Camps Bay tram line closes and the resort turns into a residential suburb.",
      },
    ],
    lookFor: [
      "The palm avenue along Victoria Road, planted when the resort was built.",
      "The rock pool at the northern end, refilled by every tide.",
      "Kasteelspoort and the buttress line of the Apostles above the town.",
      "Lion's Head across the bay, with the last of the sun on its west face.",
      "The old tram power station, now the Theatre on the Bay, on the road out.",
    ],
    practical: [
      { label: "Getting there", value: "Bus or taxi" },
      { label: "Parking", value: "Hard in December" },
      { label: "Lifeguards", value: "Summer months" },
      { label: "Best time", value: "Late afternoon" },
    ],
    camera: {
      hero: { lon: 18.3786, lat: -33.9516, zoom: 14.3, pitch: 60, bearing: 108 },
      context: { lon: 18.3735, lat: -33.9478, zoom: 12.9, pitch: 53, bearing: 130 },
      close: { lon: 18.3776, lat: -33.9508, zoom: 16.6, pitch: 68, bearing: 42 },
    },
    tags: ["beach", "sunset", "tram history", "atlantic", "palm trees", "restaurants"],
    wiki: "Camps Bay",
    featured: true,
  },
  {
    id: "twelve-apostles",
    name: "The Twelve Apostles",
    short: "Twelve Apostles",
    tagline: "The mountain's rain-facing wall above the sea",
    kind: "nature",
    district: "camps-bay",
    lon: 18.3853,
    lat: -33.9808,
    standfirst:
      "The Twelve Apostles are the buttresses on the western flank of Table Mountain, running about six kilometres south towards Hout Bay. There are seventeen or eighteen of them, they average around 750 metres, and they catch the rain that keeps the mountain green.",
    story: [
      "The Dutch called this wall the Kasteelbergen and the Gevelbergen, castle mountains and gable mountains, for the way the buttresses stand in a row like the fronts of houses. The name Twelve Apostles dates from around 1820 and has never been accurate. There are seventeen or eighteen separate peaks and buttresses, running roughly six kilometres from Kloof Nek in the north to Judas Peak above Hout Bay in the south.",
      "The rock is Table Mountain sandstone, laid down around 500 million years ago and tilted so that its western edge forms a long, steep wall above the sea. The crests average about 750 metres, lower than the flat plateau behind them, but they fall almost directly to the coast road. Rain fronts coming off the Atlantic hit this face first, and the streams running down it supplied the early city long before it had a dam.",
      "The buttresses are separated by ravines, and two of them matter to walkers. Kasteelspoort, the Castle's Portal, is the standard route up the western flank: a steep cleft between Kasteel's Buttress and Postern Buttress, with the Diving Board outcrop near the top and the concrete ruins of a cableway engine built in the 1890s to haul materials up the mountain. Oudekraal, further south, gives wilder and harder descents towards the marine reserve.",
      "The whole face is Table Mountain National Park and carries Peninsula Sandstone Fynbos, much of it found nowhere else. The Pipe Track runs along the lower slopes above Camps Bay and gives the range without the climbing; the contour path crosses the ravines higher up. Fire is part of the system here, and the slopes burn every decade or two before the fynbos returns from seed. In a winter front the wall disappears into cloud and the water comes down it in sheets.",
    ],
    facts: [
      { label: "Buttresses", value: "17 or 18" },
      { label: "Average height", value: "About 750 m" },
      { label: "Run", value: "About 6 km" },
      { label: "Main ravine", value: "Kasteelspoort" },
      { label: "Rock", value: "Sandstone" },
      { label: "Status", value: "National park" },
    ],
    timeline: [
      {
        year: "1820",
        text: "The range is renamed the Twelve Apostles, replacing the older Dutch names for the wall.",
      },
      {
        year: "1890s",
        text: "A cableway engine is built near the top of Kasteelspoort to haul material up the mountain; its ruins remain.",
      },
      {
        year: "1998",
        text: "The western flank becomes part of Table Mountain National Park.",
      },
    ],
    lookFor: [
      "The line of buttresses seen from the sea, each one separated by a dark ravine.",
      "The Diving Board outcrop near the top of Kasteelspoort, a slab over empty air.",
      "The concrete ruins of the 1890s cableway engine beside the ravine path.",
      "Contour paths cutting across the slopes, level lines on a vertical face.",
      "The colour of the rock after rain, dark brown against the fynbos.",
    ],
    practical: [
      { label: "Lower walk", value: "Pipe Track" },
      { label: "Route up", value: "Kasteelspoort" },
      { label: "Water", value: "Carry your own" },
      { label: "Weather", value: "Clouds by midday" },
    ],
    camera: {
      hero: { lon: 18.3853, lat: -33.9808, zoom: 11.9, pitch: 48, bearing: 102, lift: 620 },
      context: { lon: 18.39, lat: -33.976, zoom: 10.9, pitch: 46, bearing: 135 },
      close: { lon: 18.3835, lat: -33.979, zoom: 13.8, pitch: 56, bearing: 290, lift: 350 },
    },
    tags: ["mountain", "hiking", "fynbos", "table mountain", "ravines", "national park"],
    wiki: "Twelve Apostles (mountains)",
  },
];
