import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { useSecureCookies } from "@/lib/cookie-security";
import { PREVIEW_COOKIE } from "@/lib/preview";

/**
 * The way in while PREVIEW_MODE is on.
 *
 * Visiting /preview drops a cookie and bounces to the homepage; from then on
 * the browser sees the real site while everyone else gets the holding page.
 * A cookie rather than a querystring on every link, so the session survives
 * navigation and can be shared as one short URL.
 *
 * Deliberately NOT an authorisation boundary. It hides an unfinished site from
 * passers-by and crawlers — nothing more. Anything genuinely private is behind
 * the admin session, which this does not touch.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Off means launched: the gate is gone, so an old bookmark should just land
  // on the homepage rather than 404 or re-arm a cookie that does nothing.
  if (env.PREVIEW_MODE !== "1") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (env.PREVIEW_TOKEN) {
    const key = request.nextUrl.searchParams.get("key");
    // Wrong or missing key is shown the holding page, not a 401. An error
    // response confirms the path is real and worth attacking; the holding
    // page is what a stranger would have seen anyway.
    if (key !== env.PREVIEW_TOKEN) {
      return NextResponse.redirect(new URL("/coming-soon", request.url));
    }
  }

  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(PREVIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: await useSecureCookies(),
    path: "/",
    // Long enough to survive a review period without re-sending the link.
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
