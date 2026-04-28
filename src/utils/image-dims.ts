import dimsManifest from "../data/uploads-dims.json";

type Manifest = Record<string, [number, number]>;

const manifest = dimsManifest as Manifest;

export default function getImageDims(
    uploadsUrl: string | undefined,
): { width: number; height: number } | null {
    if (!uploadsUrl) return null;
    const key = uploadsUrl.replace(/[?#].*$/, "");
    const entry = manifest[key];
    if (!entry) return null;
    return { width: entry[0], height: entry[1] };
}
