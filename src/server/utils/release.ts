import { createError } from 'h3';
import { $fetch } from 'ofetch';

import { cacheFunction } from '#server/utils/cache';
import { SERVER_DEBUG, WG_ENV } from '#server/utils/config';

type DockerHubTag = {
  name: string;
  last_updated: string;
};

type DockerHubResponse = {
  results: DockerHubTag[];
};

/**
 * Compare two Docker tags like "15.3c" and "15.4b".
 * Splits into [major, minor, patch] where patch may contain letters.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareTags(a: string, b: string): number {
  const parse = (t: string) => {
    const parts = t.split('.');
    return {
      major: parseInt(parts[0], 10) || 0,
      minor: parseInt(parts[1], 10) || 0,
      patch: parts[2] || '',
    };
  };
  const pa = parse(a);
  const pb = parse(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch.localeCompare(pb.patch);
}

async function fetchLatestRelease() {
  if (WG_ENV.DISABLE_VERSION_CHECK) {
    return { version: '', changelog: '' };
  }

  try {
    const response = await $fetch<DockerHubResponse>(
      'https://hub.docker.com/v2/repositories/pavelrzn/wg-easy-sp/tags/?page_size=50',
      { method: 'get', timeout: 5000 }
    );

    if (!response?.results?.length) {
      throw new Error('Empty Response');
    }

    // Find the latest tag by semver-like comparison
    let latest = response.results[0].name;
    for (const tag of response.results) {
      if (compareTags(tag.name, latest) > 0) {
        latest = tag.name;
      }
    }

    return { version: latest, changelog: '' };
  } catch (e) {
    SERVER_DEBUG('Failed to fetch latest release from Docker Hub: ', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch latest release',
    });
  }
}

/**
 * Fetch latest Docker Hub tag for pavelrzn/wg-easy-sp
 * @cache Response is cached for 1 hour
 */
export const cachedFetchLatestRelease = cacheFunction(fetchLatestRelease, {
  expiry: 60 * 60 * 1000,
});
