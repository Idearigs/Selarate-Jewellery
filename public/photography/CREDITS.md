# Preview photography — replace before launch

Every image in this directory is **free-licence stock from Unsplash**, added so the
layouts could be reviewed with real photography instead of hatched placeholders.

**None of it shows the studio's own work.** That matters more here than the licence
does: this is a storefront for one-of-a-kind pieces, and a buyer paying five figures
for a piece that is not the piece in the photograph is a misrepresentation, not a
placeholder. Treat this directory as a deletion target, not an asset library.

## Removing it

The build degrades cleanly, one piece at a time — `PlaceholderImage` renders the
hatched shot-list box for any piece with no image rows, so photography can land
piece by piece.

To revert to placeholders entirely:

1. Delete this directory.
2. Empty the `IMAGES` map in `lib/db/seed.ts`.
3. Clear the two `src` props in `app/(storefront)/page.tsx` (hero, maker portrait).
4. Reseed.

## Generated imagery

`atelier-bench.jpg` and `maker-portrait.jpg` are **AI-generated** (Google Flow / Nano Banana Pro), not a
photograph of a real studio. It is not stock and carries no third-party licence,
but it is also not the client's bench — the same replace-before-launch rule
applies, for the same reason: a process page is a claim about how the work is
actually done.

Chosen from four candidates for the desktop crop specifically. The hero is cut
two ways — 3:2 on mobile, a ~3:1 band on desktop — so the source is kept at
2400x1350 (16:9), wider than either, and the frame had to survive an aggressive
horizontal crop. It also matches the intro copy element for element: bench,
north window, rolling mill, torch, wall of drawers.

The rejected bench frames all had legible drawer labels in garbled AI text.
This one's are small enough to read as texture rather than as words.

`maker-portrait.jpg` replaced a stock photograph of a woman at a bench, which
had become actively wrong once the maker was named: an invented likeness under
a real person's name is a claim, not a placeholder. Chosen over its alternate
because the ring in his fingers reads as a finished gold band rather than a
molten lump. Hands were checked at 2x for finger count and grip before use.

## Source

Unsplash, under the [Unsplash Licence](https://unsplash.com/license) — free for
commercial use, no attribution required (attribution appreciated). Retrieved
2026-08-10.

Photographer names were not captured at download time. If any of these are ever
intended for public use, resolve the credit first via the source URL below.

| File | Source |
|---|---|
| `hero-hand.jpg` | `images.unsplash.com/photo-1614606140245-2c33ece9e2cf` |
| `sweet-pea-ring-1.jpg` | `images.unsplash.com/photo-1776261762008-d78c9b6c4ad6` |
| `sweet-pea-ring-2.jpg` | `images.unsplash.com/photo-1776261761996-a4b1edda4cf4` |
| `meridian-cuff-1.jpg` | `images.unsplash.com/photo-1786052352801-7820daa1edf3` |
| `meridian-cuff-2.jpg` | `images.unsplash.com/photo-1786052348449-1dfe87c31b37` |
| `tideline-pendant-1.jpg` | `images.unsplash.com/photo-1569397288884-4d43d6738fbd` |
| `ember-band-1.jpg` | `images.unsplash.com/photo-1689367436629-1d288f1e23b6` |
| `ember-band-2.jpg` | `images.unsplash.com/photo-1689367436442-76c859315008` |

## Processing

Card images were cropped to the handoff's fixed 4:5 (1000×1250) using `sharp`'s
attention strategy rather than a centre crop — several sources were 16:9 with the
piece off-centre, where a centre crop removed the subject. Hero and portrait were
left at their native ratios; `object-cover` handles the framing.
