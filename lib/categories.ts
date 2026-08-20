import type { Category } from "@/lib/types";

/**
 * The two ways into the catalogue, described once.
 *
 * The homepage entry section and the collection page's own header both render
 * this. They previously held separate copies of the same sentences, which is
 * exactly the sort of thing that drifts — and the blurb is also the collection
 * page's meta description, so a divergence is an SEO defect, not just an
 * inconsistency.
 */
export interface CategoryCopy {
  title: string;
  blurb: string;
  /** Shorter line for the homepage, where the column is narrow. */
  teaser: string;
  /** The call to action. Each says what it leads to, never "click here". */
  cta: string;
  href: string;
}

export const CATEGORIES: Record<Category, CategoryCopy> = {
  ooak: {
    title: "One of a Kind",
    blurb:
      "Finished pieces made once and never repeated. Each is drawn around a single stone, so when it sells the design leaves the collection with it.",
    teaser:
      "Finished pieces made once and never repeated, each drawn around a single stone.",
    cta: "Explore one of a kind",
    href: "/collection?category=ooak",
  },
  fine: {
    title: "Fine Jewelry",
    blurb:
      "Signature designs made to order in the studio. The form is settled; metal, stone and size are chosen with you. Six to eight weeks from order.",
    teaser:
      "Signature designs made to order — metal, stone and size chosen with you.",
    cta: "See fine jewelry",
    href: "/collection?category=fine",
  },
};

export const CATEGORY_ORDER: Category[] = ["ooak", "fine"];
