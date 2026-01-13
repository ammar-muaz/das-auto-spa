export function getPageTitle(pathname: string): string {
    // Remove query params
    const cleanPath = pathname.split("?")[0];

    // Break into segments
    const segments = cleanPath.split("/").filter(Boolean);

    // Remove role prefixes like /admin or /user
    const rolePrefixes = ["admin", "user"];
    const prefixIndex = segments.findIndex((s) => rolePrefixes.includes(s));

    const relevant =
        prefixIndex !== -1 ? segments.slice(prefixIndex + 1) : segments;

    // Default dashboard
    if (relevant.length === 0) {
        return "Dashboard";
    }

    /**
     * If last segment looks like an ID (uuid, cuid, nanoid, number),
     * use the previous segment as title
     */
    const last = relevant[relevant.length - 1];
    const prev = relevant[relevant.length - 2];

    const isId =
        /^[a-zA-Z0-9_-]{6,}$/.test(last) || // uuid / nanoid / cuid
        /^\d+$/.test(last); // numeric id

    const titleSegment = isId ? prev ?? last : last;

    return formatTitle(titleSegment);
}

function formatTitle(value: string): string {
    return value
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
