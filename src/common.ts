export function sterilizePath(path: string): string {
    // Replace all backslashes with forward slashes
    return path.replace(/\\/g, '/');
}

export function joinPath(path: string, ...paths: string[]): string {
    // Join paths with forward slashes
    return sterilizePath(paths.reduce((acc, p) => acc + '/' + p, path));
}

export function goBackPath(path: string, levels: number): string {
    // Go back one directory
    return sterilizePath(path).split('/').slice(0, -levels).join('/');
}