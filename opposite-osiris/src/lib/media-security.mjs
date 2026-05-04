const SAFE_PUBLIC_ASSET_PATTERN = /^[-A-Za-z0-9._%() ]+\.(?:avif|gif|jpe?g|png|svg|webp)$/u;
const BLOCKED_PATH_PATTERN = /(?:^|[\\/])\.\.(?:[\\/]|$)|[\\/]|\0|^[a-z][a-z0-9+.-]*:/iu;

/**
 * Builds a same-origin `/assets/...` URL for checked-in public media only.
 *
 * User-controlled upload paths must never be passed here. The allowlist blocks
 * traversal, protocols (`javascript:`, `data:`, `https:`), NUL bytes and nested
 * paths so future media additions cannot accidentally create URL injection.
 *
 * @param {string} fileName
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function safePublicAssetPath(fileName, baseUrl = '/') {
	const decodedFileName = decodeURIComponent(fileName);
	if (BLOCKED_PATH_PATTERN.test(fileName) || BLOCKED_PATH_PATTERN.test(decodedFileName) || !SAFE_PUBLIC_ASSET_PATTERN.test(decodedFileName)) {
		throw new Error(`Unsafe public asset path rejected: ${fileName}`);
	}

	const encodedSegments = decodedFileName
		.split(' ')
		.map((segment) => encodeURIComponent(segment))
		.join('%20');
	return `${baseUrl.replace(/\/$/, '')}/assets/${encodedSegments}`;
}
