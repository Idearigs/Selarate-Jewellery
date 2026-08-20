/**
 * Seeds the catalogue with the exact content from the prototypes, so every
 * page renders real-shaped data from day one and the built site can be compared
 * side by side with the .dc.html references.
 *
 * Idempotent: safe to re-run. Run with `npm run db:seed`.
 */
import { sql } from "drizzle-orm";
import type { Db } from "./index";
import {
  material,
  materialUse,
  piece,
  pieceImage,
  pieceSize,
  pieceSpec,
  settings,
} from "./schema";

const RING_SIZES = ["5", "5½", "6", "6½", "7", "7½", "8"];

/**
 * PREVIEW PHOTOGRAPHY — NOT THE CLIENT'S WORK.
 *
 * Free-licence stock standing in for the studio's own shoot so the layouts can
 * be reviewed with real images. These are other makers' pieces, so every one of
 * them must be replaced before launch — a one-of-a-kind storefront showing
 * someone else's ring is a trust problem, not just a licensing one. See
 * public/photography/CREDITS.md.
 *
 * Pieces absent from this map keep rendering PlaceholderImage, which is the
 * point: photography can land one piece at a time.
 *
 * Position 0 is the card's primary; position 1 is what it crossfades to on
 * hover. All are pre-cropped to 4:5.
 */
const IMAGES: Record<string, { file: string; alt: string }[]> = {
  "sweet-pea-ring": [
    {
      file: "sweet-pea-ring-1.jpg",
      alt: "Yellow gold ring set with a cluster of green stones, resting on weathered driftwood.",
    },
    {
      file: "sweet-pea-ring-2.jpg",
      alt: "The same green-stone gold ring photographed close, the band catching warm light.",
    },
  ],
  "meridian-cuff": [
    {
      file: "meridian-cuff-1.jpg",
      alt: "Wide banded gold cuff standing upright on a pale surface.",
    },
    {
      file: "meridian-cuff-2.jpg",
      alt: "Gold cuff set with pale cabochon stones, lit from above.",
    },
  ],
  "tideline-pendant": [
    {
      file: "tideline-pendant-1.jpg",
      alt: "Slim gold bar pendant on a fine chain, against a dark ground.",
    },
  ],
  "ember-band": [
    {
      file: "ember-band-1.jpg",
      alt: "Gold band set with four warm orange stones, against a sandstone backdrop.",
    },
    {
      file: "ember-band-2.jpg",
      alt: "The orange-stone gold band from a second angle.",
    },
  ],
};

type SeedPiece = {
  slug: string;
  reference: string;
  name: string;
  category: "ooak" | "fine";
  availability: "unique" | "order";
  priceCents: number;
  materialLine: string;
  filterTag: string;
  season?: string;
  story?: string;
  sizes?: string[];
  defaultSize?: string;
  sizeNote?: string;
  specs?: { key: string; value: string }[];
  /** Held pieces get the "Reserved" corner tag in the listing. */
  reserved?: boolean;
};

const PIECES: SeedPiece[] = [
  {
    slug: "sweet-pea-ring",
    reference: "A—01",
    name: "Sweet Pea Ring",
    category: "ooak",
    availability: "unique",
    priceCents: 14_800_00,
    materialLine: "18k yellow gold, 4.2 ct green tourmaline",
    filterTag: "Rings",
    season: "Spring 2026",
    story:
      "A single 4.2 ct green tourmaline held in a hand-formed 18k gold blossom. The band is forged from one length of wire, then filed and burnished so no seam remains. Made once; there is no second.",
    sizes: RING_SIZES,
    defaultSize: "6½",
    sizeNote:
      "Currently a US 6½. Resizing within two sizes is complimentary and takes about ten days.",
    specs: [
      { key: "Stone", value: "4.2 ct green tourmaline, cushion cut" },
      { key: "Metal", value: "18k yellow gold, hand-burnished" },
      { key: "Dimensions", value: "Blossom 14 mm across, band 2.4 mm" },
      { key: "Edition", value: "One of one — not reproduced" },
      { key: "Made", value: "Studio, Spring 2026" },
    ],
  },
  {
    slug: "meridian-cuff",
    reference: "A—02",
    name: "Meridian Cuff",
    category: "ooak",
    availability: "unique",
    priceCents: 9_200_00,
    materialLine: "Rose gold, brushed and forged",
    filterTag: "Cuffs",
    season: "Spring 2026",
    story:
      "Raised from a single sheet of rose gold over a stake, so the metal thickens where the cuff meets the wrist and thins at the opening. The brushed face is worked in one direction only; it will soften with wear rather than scratch.",
    specs: [
      { key: "Metal", value: "18k rose gold, alloyed in the studio" },
      { key: "Dimensions", value: "Band 18 mm at centre, 1.6 mm gauge" },
      { key: "Fit", value: "Oval, 165 mm inner circumference with a 28 mm gap" },
      { key: "Edition", value: "One of one — not reproduced" },
      { key: "Made", value: "Studio, Spring 2026" },
    ],
  },
  {
    slug: "tideline-pendant",
    reference: "A—03",
    name: "Tideline Pendant",
    category: "ooak",
    availability: "unique",
    priceCents: 6_450_00,
    materialLine: "White gold, Australian opal",
    filterTag: "Necklaces",
    season: "Spring 2026",
    story:
      "A freeform Lightning Ridge opal, bought uncut and left in its own outline rather than ground to a shape. The white gold surround was drawn around the stone afterwards, which is the only order that works when no two opals are alike.",
    specs: [
      { key: "Stone", value: "6.8 ct Australian opal, freeform, Lightning Ridge" },
      { key: "Metal", value: "18k white gold, unrhodiumed" },
      { key: "Dimensions", value: "Pendant 22 × 15 mm on a 450 mm chain" },
      { key: "Edition", value: "One of one — not reproduced" },
      { key: "Made", value: "Studio, Spring 2026" },
    ],
  },
  {
    slug: "ember-band",
    reference: "A—04",
    name: "Ember Band",
    category: "ooak",
    availability: "unique",
    priceCents: 4_900_00,
    materialLine: "22k gold, spessartite garnet",
    filterTag: "Rings",
    season: "Spring 2026",
    sizes: RING_SIZES,
    defaultSize: "7",
    sizeNote:
      "Currently a US 7. Resizing within two sizes is complimentary and takes about ten days.",
    story:
      "A 2.1 ct spessartite set flush into a heavy 22k band, so the stone sits level with the metal and catches nothing. Twenty-two carat is deliberately soft — it burnishes closed around the stone and takes the warm colour that lower alloys cannot.",
    specs: [
      { key: "Stone", value: "2.1 ct spessartite garnet, round brilliant" },
      { key: "Metal", value: "22k yellow gold, flush set" },
      { key: "Dimensions", value: "Band 4.8 mm wide, 2.2 mm deep" },
      { key: "Edition", value: "One of one — not reproduced" },
      { key: "Made", value: "Studio, Spring 2026" },
    ],
  },
  {
    slug: "kelp-earrings",
    reference: "A—05",
    name: "Kelp Earrings",
    category: "ooak",
    availability: "unique",
    priceCents: 3_750_00,
    materialLine: "18k gold, seed pearl",
    filterTag: "Earrings",
    season: "Spring 2026",
    story:
      "Two lengths of 18k wire forged flat and given a slow twist, the way kelp turns in a current. A single seed pearl hangs at the end of each so the movement has somewhere to finish. They are a matched pair, not identical ones.",
    specs: [
      { key: "Stone", value: "Two seed pearls, 3.5 mm, natural colour" },
      { key: "Metal", value: "18k yellow gold, forged and twisted" },
      { key: "Dimensions", value: "48 mm drop, 9 mm at the widest" },
      { key: "Fittings", value: "18k posts with butterfly backs" },
      { key: "Edition", value: "One of one — not reproduced" },
    ],
  },
  {
    slug: "salt-flat-ring",
    reference: "A—06",
    name: "Salt Flat Ring",
    category: "ooak",
    availability: "unique",
    priceCents: 11_200_00,
    materialLine: "Palladium white gold, rough diamond",
    filterTag: "Rings",
    season: "Spring 2026",
    sizes: RING_SIZES,
    defaultSize: "6",
    sizeNote:
      "Currently a US 6. The rough crystal limits resizing to one size either way.",
    story:
      "An uncut octahedral diamond, held on four corners exactly as it came out of the ground. Palladium white gold rather than rhodium-plated: the colour is in the alloy, so it will never wear yellow at the shank.",
    specs: [
      { key: "Stone", value: "3.4 ct rough diamond, natural octahedron" },
      { key: "Metal", value: "18k palladium white gold, unplated" },
      { key: "Dimensions", value: "Crystal 8 mm across, band 2.8 mm" },
      { key: "Edition", value: "One of one — not reproduced" },
      { key: "Made", value: "Studio, Spring 2026" },
    ],
  },

  // Fine Jewelry — made to order, no inventory limit, 6–8 week lead time.
  {
    slug: "spectra-band",
    reference: "F—01",
    name: "Spectra Band",
    category: "fine",
    availability: "order",
    priceCents: 2_450_00,
    materialLine: "Graduated gold, 3 mm",
    filterTag: "Rings",
    sizes: RING_SIZES,
    sizeNote:
      "Made to your size, so there is nothing to resize later. Book a fitting if you are between sizes.",
    story:
      "A band rolled from a tapered strip, so it reads as 3 mm across the top and narrows to 2 mm behind the finger. The weight sits where it is seen and disappears where it is not — the reason it stacks without crowding.",
    specs: [
      { key: "Metal", value: "18k yellow, rose or white gold" },
      { key: "Dimensions", value: "3 mm at the face, tapering to 2 mm" },
      { key: "Finish", value: "Burnished, matte or hammered" },
      { key: "Made to order", value: "Metal and finish chosen with you" },
      { key: "Lead time", value: "Six to eight weeks from order" },
    ],
  },
  {
    slug: "cordon-chain",
    reference: "F—02",
    name: "Cordon Chain",
    category: "fine",
    availability: "order",
    priceCents: 5_600_00,
    materialLine: "18k gold, hand-linked",
    filterTag: "Necklaces",
    story:
      "Every link is cut, closed and soldered by hand, then the whole chain is drawn down together so the joins compress into the form. It is the slow way to make a chain and the only one that gives this weight its drape.",
    specs: [
      { key: "Metal", value: "18k yellow, rose or white gold" },
      { key: "Dimensions", value: "4 mm links, 42 / 45 / 50 cm lengths" },
      { key: "Clasp", value: "Hand-made bolt ring, solid 18k" },
      { key: "Made to order", value: "Metal and length chosen with you" },
      { key: "Lead time", value: "Six to eight weeks from order" },
    ],
  },
  {
    slug: "petal-studs",
    reference: "F—03",
    name: "Petal Studs",
    category: "fine",
    availability: "order",
    priceCents: 1_980_00,
    materialLine: "18k gold, brilliant diamond",
    filterTag: "Earrings",
    story:
      "Five petals raised individually and soldered around a single brilliant, so the stone sits in a cup of gold rather than on top of one. Small enough to sleep in; the backs are threaded rather than push-fit for exactly that reason.",
    specs: [
      { key: "Stone", value: "0.15 ct brilliant diamond each, F/VS" },
      { key: "Metal", value: "18k yellow, rose or white gold" },
      { key: "Dimensions", value: "7 mm across" },
      { key: "Fittings", value: "Threaded 18k posts and backs" },
      { key: "Lead time", value: "Six to eight weeks from order" },
    ],
  },
  {
    slug: "dune-cuff",
    reference: "F—04",
    name: "Dune Cuff",
    category: "fine",
    availability: "order",
    priceCents: 6_900_00,
    materialLine: "Yellow gold, matte finish",
    filterTag: "Cuffs",
    story:
      "A wide, softly domed cuff finished to a matte that holds light instead of throwing it. Hollow-formed rather than solid, which keeps the scale generous and the weight wearable through a working day.",
    specs: [
      { key: "Metal", value: "18k yellow gold, hollow-formed" },
      { key: "Dimensions", value: "24 mm wide, domed to 4 mm" },
      { key: "Fit", value: "Made to your wrist measurement" },
      { key: "Finish", value: "Matte as shown, or burnished" },
      { key: "Lead time", value: "Six to eight weeks from order" },
    ],
  },
  {
    slug: "solitaire-sette",
    reference: "F—05",
    name: "Solitaire Sette",
    category: "fine",
    availability: "order",
    priceCents: 3_400_00,
    materialLine: "White gold, your stone",
    filterTag: "Rings",
    sizes: RING_SIZES,
    sizeNote:
      "Made to your size. If the stone is an heirloom, bring the existing setting and we will measure from it.",
    story:
      "A six-claw solitaire drawn to whatever stone you bring — bought loose through the studio, or lifted from a setting you already own. The price here is the mount; the stone is quoted separately once we have seen it.",
    specs: [
      { key: "Stone", value: "Yours, or sourced with you — quoted separately" },
      { key: "Metal", value: "18k palladium white gold, unplated" },
      { key: "Setting", value: "Six claws, hand-cut from the shank" },
      { key: "Heirlooms", value: "Original metal weight is credited back" },
      { key: "Lead time", value: "Six to eight weeks from order" },
    ],
  },
  {
    slug: "wave-hoops",
    reference: "F—06",
    name: "Wave Hoops",
    category: "fine",
    availability: "order",
    priceCents: 2_200_00,
    materialLine: "18k gold, forged wire",
    filterTag: "Earrings",
    story:
      "Round wire forged to an oval section and bent into a hoop that is thicker at the base than at the hinge. The taper is what stops a hoop of this size from dragging at the lobe, and it is only achievable by hand.",
    specs: [
      { key: "Metal", value: "18k yellow, rose or white gold" },
      { key: "Dimensions", value: "28 mm outer, 2.4 mm tapering to 1.6 mm" },
      { key: "Fittings", value: "Hinged 18k catch, no separate back to lose" },
      { key: "Made to order", value: "Metal chosen with you" },
      { key: "Lead time", value: "Six to eight weeks from order" },
    ],
  },
];

/** Loose stone and metal — studio inventory, deliberately NOT catalogue stock. */
const MATERIALS = [
  {
    ref: "ST—114",
    name: "Green tourmaline, cushion",
    kind: "stone" as const,
    origin: "Minas Gerais, Brazil",
    acquiredAt: new Date("2022-09-14"),
    qty: 1,
    unit: "ct",
    costCents: 3_100_00,
    status: "set" as const,
    setInSlug: "sweet-pea-ring",
  },
  {
    ref: "ST—118",
    name: "Australian opal, freeform",
    kind: "stone" as const,
    origin: "Lightning Ridge, NSW",
    acquiredAt: new Date("2023-02-02"),
    qty: 1,
    unit: "ct",
    costCents: 1_450_00,
    status: "set" as const,
    setInSlug: "tideline-pendant",
  },
  {
    ref: "ST—131",
    name: "Rough diamond, octahedral",
    kind: "stone" as const,
    origin: "Northwest Territories, Canada",
    acquiredAt: new Date("2024-06-19"),
    qty: 2,
    unit: "ct",
    costCents: 5_900_00,
    status: "loose" as const,
  },
  {
    ref: "MT—007",
    name: "18k yellow casting grain",
    kind: "metal" as const,
    origin: "Refiner, Los Angeles",
    acquiredAt: new Date("2025-11-03"),
    qty: 240,
    unit: "g",
    costCents: 18_400_00,
    status: "low" as const,
    reorderPoint: 300,
  },
  {
    ref: "HR—002",
    name: "Client heirloom — grandmother's solitaire",
    kind: "heirloom" as const,
    origin: "Client owned, held for reset",
    acquiredAt: new Date("2026-01-22"),
    qty: 1,
    unit: "pc",
    costCents: null,
    status: "client_owned" as const,
  },
];

/**
 * Accepts the db rather than resolving it, so it can be called during
 * first-boot initialisation without re-entering getDb().
 */
export async function seed(db: Db) {

  await db
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: settings.id });

  for (const [index, p] of PIECES.entries()) {
    const [row] = await db
      .insert(piece)
      .values({
        slug: p.slug,
        reference: p.reference,
        name: p.name,
        category: p.category,
        availability: p.availability,
        priceCents: p.priceCents,
        materialLine: p.materialLine,
        filterTag: p.filterTag,
        season: p.season ?? null,
        story: p.story ?? "",
        defaultSize: p.defaultSize ?? null,
        sizeNote: p.sizeNote ?? null,
        sortIndex: index,
        publishedAt: new Date(),
      })
      /*
       * Every editable column, not a subset.
       *
       * This previously updated only name, price and material line, so editing
       * a story or a size note in this file changed nothing on a re-seed — the
       * insert lost the conflict and the new copy was silently dropped, while
       * specs and images (deleted and re-inserted below) did update. The result
       * was a piece whose spec table and description disagreed about what it is.
       *
       * `soldAt`, `views` and `createdAt` are deliberately absent: they are
       * runtime state, and a seed that resurrects a sold piece or resets its
       * view count is destroying real data, not refreshing fixtures.
       */
      .onConflictDoUpdate({
        target: piece.slug,
        set: {
          reference: p.reference,
          name: p.name,
          category: p.category,
          availability: p.availability,
          priceCents: p.priceCents,
          materialLine: p.materialLine,
          filterTag: p.filterTag,
          season: p.season ?? null,
          story: p.story ?? "",
          defaultSize: p.defaultSize ?? null,
          sizeNote: p.sizeNote ?? null,
          sortIndex: index,
          updatedAt: new Date(),
        },
      })
      .returning({ id: piece.id });

    if (!row) continue;

    // Replace children wholesale — keeps the seed idempotent without diffing.
    await db.delete(pieceSpec).where(sql`${pieceSpec.pieceId} = ${row.id}`);
    await db.delete(pieceSize).where(sql`${pieceSize.pieceId} = ${row.id}`);
    await db.delete(pieceImage).where(sql`${pieceImage.pieceId} = ${row.id}`);

    const shots = IMAGES[p.slug];
    if (shots?.length) {
      await db.insert(pieceImage).values(
        shots.map((s, i) => ({
          pieceId: row.id,
          url: `/photography/${s.file}`,
          alt: s.alt,
          role: (i === 0 ? "primary" : "detail") as "primary" | "detail",
          width: 1000,
          height: 1250,
          position: i,
        })),
      );
    }

    if (p.specs?.length) {
      await db.insert(pieceSpec).values(
        p.specs.map((s, i) => ({
          pieceId: row.id,
          key: s.key,
          value: s.value,
          position: i,
        })),
      );
    }

    if (p.sizes?.length) {
      await db.insert(pieceSize).values(
        p.sizes.map((label, i) => ({ pieceId: row.id, label, position: i })),
      );
    }
  }

  for (const m of MATERIALS) {
    const { setInSlug, ...values } = m as typeof m & { setInSlug?: string };
    const [row] = await db
      .insert(material)
      .values(values)
      .onConflictDoUpdate({ target: material.ref, set: { status: values.status } })
      .returning({ id: material.id });

    if (row && setInSlug) {
      const target = await db.query.piece.findFirst({
        where: (t, { eq }) => eq(t.slug, setInSlug),
        columns: { id: true },
      });
      if (target) {
        await db
          .insert(materialUse)
          .values({ materialId: row.id, pieceId: target.id })
          .onConflictDoNothing();
      }
    }
  }

  const reserved = PIECES.filter((p) => p.reserved).map((p) => p.slug);
  console.log(
    `Seeded ${PIECES.length} pieces and ${MATERIALS.length} materials.` +
      (reserved.length ? ` Marked reserved: ${reserved.join(", ")}.` : ""),
  );
}

// `npm run db:seed` — for a real Postgres (DATABASE_URL set). The embedded dev
// database seeds itself on first boot; see the ownership note in ./index.ts.
if (process.argv[1]?.includes("seed")) {
  const { getDb } = await import("./index");
  getDb()
    .then((db) => seed(db))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
