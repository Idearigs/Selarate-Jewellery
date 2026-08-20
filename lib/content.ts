/**
 * Editorial copy for the content pages, transcribed from the prototypes.
 *
 * Kept in one module rather than inline in the pages: it is the copy most
 * likely to be handed to a CMS later, and pulling it out keeps the page
 * components readable as layout.
 *
 * Anything marked TODO(launch) is the reference site's placeholder detail and
 * must be replaced before going live — several of these also feed the
 * JewelryStore structured data, so stale values are a search problem.
 */

export const ABOUT = {
  eyebrow: "The Maker",
  heading: ["Twenty-five years", "at the same", "bench."],
  intro:
    "Gemologist and goldsmith. Every stone is chosen by hand, every setting cut, set and finished in the studio. Nothing leaves the bench until it can be worn every day for fifty years.",
  statement: "A practice built on one rule: make it once, make it right.",
  essay: [
    "The studio began with a bench, a torch and a drawer of rough stone. It has stayed roughly that size on purpose. Work is taken in small numbers so that each piece can be drawn around the stone in front of it rather than fitted into a standing design.",
    "Stones are bought loose, often years before they are set. Gold is alloyed and rolled in house, which is why the colour shifts a little between pieces — a batch of 22k warmed one way will never be matched exactly by the next.",
    "Clients are welcome at the bench. Most commissions start with a visit, a tray of stone and an hour of drawing.",
  ],
  steps: [
    {
      n: "01",
      title: "The stone",
      body: "Rough or cut stone is selected first and lives in the studio until the right form suggests itself.",
    },
    {
      n: "02",
      title: "Drawing",
      body: "Sketched at scale by hand, then wax-modelled so the proportions can be tried on before any gold is cut.",
    },
    {
      n: "03",
      title: "Forging",
      body: "Gold alloyed and rolled in house, raised or forged rather than cast wherever the form allows.",
    },
    {
      n: "04",
      title: "Setting & finish",
      body: "Stones set by hand, surfaces filed, sanded and burnished. No plating and no filler.",
    },
  ],
  facts: [
    { key: "Training", value: "Goldsmithing apprenticeship, 1999–2003" },
    { key: "Certification", value: "Graduate Gemologist" },
    { key: "Recognition", value: "Design awards in four consecutive years" },
    { key: "Studio", value: "Founded 2001, one bench, two hands" },
  ],
} as const;

export const ATELIER = {
  heading: "The atelier",
  intro: [
    "The studio is one room: a bench under a north window, a rolling mill, a torch and a wall of small drawers. Everything that is made here is made at that bench, by hand, from stock that was alloyed a few feet away.",
    "This page is the process. If you are looking for the person rather than the practice, the about page is the one you want.",
  ],
  stages: [
    {
      n: "01",
      title: "The stone",
      body: "Rough or cut stone is selected first and kept in the studio until a form suggests itself. Nothing is bought to fill a design.",
      tools: "Loupe · Tweezers · Daylight lamp",
      shot: "STONE TRAY",
      image: "/photography/atelier-stone-tray.jpg",
      alt: "A leather tray of loose stones — rough green tourmaline crystals, opals, clear diamond octahedra and orange garnets — beside brass tweezers and a loupe.",
    },
    {
      n: "02",
      title: "Drawing and wax",
      body: "Sketched at scale by hand, then carved in wax so proportion and weight can be tried on before any gold is cut.",
      tools: "Pencil · Wax file · Calipers",
      shot: "WAX MODEL",
      image: "/photography/atelier-wax.jpg",
      alt: "A pale blue-green carving wax ring model held between finger and thumb, file marks still across its surface, wax files and a saw on the bench behind.",
    },
    {
      n: "03",
      title: "Forging",
      body: "Gold alloyed and rolled in house, then raised or forged over stakes wherever the form allows. Casting is a last resort.",
      tools: "Torch · Rolling mill · Stakes",
      shot: "TORCH AND BENCH",
      image: "/photography/atelier-torch.jpg",
      alt: "A gold band on a soldering block, the blue flame of a jeweller’s torch drawing the joint to an orange glow.",
    },
    {
      n: "04",
      title: "Setting and finish",
      body: "Stones set by hand, surfaces filed, sanded and burnished through eight grades. No plating, no filler, no shortcut.",
      tools: "Graver · Burnisher · Loupe",
      shot: "SETTING DETAIL",
      image: "/photography/atelier-setting.jpg",
      alt: "A steel pusher closing a gold bezel around an emerald-cut green tourmaline, the ring steadied against the bench pin.",
    },
  ],
  materials: [
    {
      title: "Gold",
      body: "Alloyed and rolled in the studio in 18k and 22k. Recycled stock wherever the colour allows.",
      shot: "GOLD STOCK",
      image: "/photography/atelier-gold-stock.jpg",
      alt: "Raw gold stock on a worn benchtop — a coil of round wire, two flat rolled strips and a small pile of casting grain, beside steel calipers.",
    },
    {
      title: "Stone",
      body: "Bought loose from cutters in Idar-Oberstein and Jaipur, with origin recorded for every piece.",
      shot: "ROUGH AND CUT",
      image: "/photography/atelier-rough-cut.jpg",
      alt: "Stones on a paper parcel, rough crystals grouped on one side and the same materials faceted on the other — green tourmaline, opal and garnet.",
    },
    {
      title: "Heirlooms",
      body: "Client metal and stone are reworked into new pieces, with the original weight accounted for.",
      shot: "OLD SETTINGS",
      image: "/photography/atelier-old-settings.jpg",
      alt: "A cluster of old gold ring mounts and empty settings on folded linen, worn and waiting to be reworked.",
    },
  ],
  terms: [
    { key: "First meeting", value: "One hour at the bench, no charge" },
    { key: "Deposit", value: "Half on approval of the drawing" },
    { key: "Timeline", value: "Six to twelve weeks" },
    { key: "Revisions", value: "Wax stage, as many as needed" },
  ],
} as const;

export const CONTACT = {
  heading: "Come and see the work.",
  intro:
    "The studio is open by appointment, and often when the bench is quiet. There is no obligation to buy anything — most visits are a tray of stone and a conversation.",
  // TODO(launch): every value below is the reference site's placeholder and
  // also feeds the JewelryStore structured data. Replace before going live.
  address: ["1492 South Coast Highway", "Laguna Beach, California 92651"],
  details: [
    { key: "Email", value: "studio@brandname.com" },
    { key: "Telephone", value: "+1 (949) 715-0953" },
    {
      key: "Appointments",
      value:
        "Preferred, though walk-ins are welcome when the bench is quiet",
    },
    { key: "Instagram", value: "@brandname" },
  ],
  hours: [
    { day: "Tuesday – Friday", time: "11:00 – 18:00" },
    { day: "Saturday", time: "11:00 – 16:00" },
    { day: "Sunday – Monday", time: "By appointment" },
  ],
  reasons: [
    { value: "visit", label: "Studio visit" },
    { value: "piece", label: "A piece for sale" },
    { value: "commission", label: "Commission" },
    { value: "repair", label: "Repair or resize" },
  ],
} as const;

/**
 * The footer's Care column. Not designed in the handoff, but linked from every
 * page — an unstyled 404 in the footer of a five-figure storefront reads as
 * abandonment, so these get real pages built from the same primitives.
 */
export const CARE = {
  sizing: {
    title: "Sizing",
    intro:
      "One-of-a-kind pieces ship in the size they were made. Most can be adjusted, and the first adjustment is on the studio.",
    rows: [
      { key: "Complimentary", value: "Resizing within two sizes, in the first year" },
      { key: "Turnaround", value: "About ten days from arrival at the bench" },
      { key: "Not resizable", value: "Full eternity bands and some carved shanks" },
      { key: "Not sure?", value: "Book a visit and we will measure you properly" },
    ],
  },
  shipping: {
    title: "Shipping",
    intro:
      "Every piece ships fully insured and signature-required, worldwide. Shipping is included in the price — there is no separate charge at checkout.",
    rows: [
      { key: "Insurance", value: "Full value, door to door" },
      { key: "Signature", value: "Required on every delivery" },
      { key: "Domestic", value: "Two to three working days once dispatched" },
      { key: "International", value: "Five to ten working days; duties are the buyer's" },
    ],
  },
  repairs: {
    title: "Repairs",
    intro:
      "Anything made in this studio is looked after by it, for as long as it exists. Cleaning, re-polishing and stone-tightening are free, forever.",
    rows: [
      { key: "Free, always", value: "Cleaning, re-polishing, stone-tightening" },
      { key: "At cost", value: "Damage, loss of stone, reshanking" },
      { key: "Other makers", value: "Considered case by case — write first" },
      { key: "To begin", value: "Write to the studio before sending anything" },
    ],
  },
} as const;

export type CareTopic = keyof typeof CARE;
