/**
 * Looks up a Roblox username against Roblox's public, unauthenticated user
 * API. This does NOT prove the site's user owns that Roblox account — it's
 * a plain public lookup anyone could make. It exists purely to:
 *   1. Catch typos / made-up usernames at signup.
 *   2. Show a real avatar and display name on the profile.
 *
 * Roblox's own anti-bot protection occasionally rate-limits server-to-server
 * calls to this endpoint, so this is treated as best-effort: if it fails,
 * registration still proceeds with the username as typed, just unverified.
 */
export interface RobloxLookupResult {
  found: boolean;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
}

export async function lookupRobloxUsername(username: string): Promise<RobloxLookupResult> {
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { found: false };

    const data = await res.json();
    const match = data?.data?.[0];
    if (!match?.id) return { found: false };

    const userId = String(match.id);
    let avatarUrl: string | undefined;
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        avatarUrl = thumbData?.data?.[0]?.imageUrl;
      }
    } catch {
      // avatar is cosmetic — fine to skip if this leg fails
    }

    return { found: true, userId, displayName: match.displayName ?? match.name, avatarUrl };
  } catch (err) {
    console.error("Roblox username lookup failed (non-fatal)", err);
    return { found: false };
  }
}
