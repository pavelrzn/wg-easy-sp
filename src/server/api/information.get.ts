import { defineEventHandler } from 'h3';

import Database from '#server/utils/Database';
import { DOCKER_TAG, WG_ENV } from '#server/utils/config';
import { cachedFetchLatestRelease, compareTags } from '#server/utils/release';

export default defineEventHandler(async () => {
  const latestRelease = await cachedFetchLatestRelease();
  const updateAvailable = latestRelease.version
    ? compareTags(latestRelease.version, DOCKER_TAG) > 0
    : false;
  const insecure = WG_ENV.INSECURE;
  const isAwg = WG_ENV.WG_EXECUTABLE === 'awg';
  const wgInterface = await Database.interfaces.get();

  return {
    currentRelease: DOCKER_TAG,
    latestRelease: latestRelease,
    updateAvailable,
    insecure,
    isAwg,
    firewallEnabled: wgInterface.firewallEnabled,
  };
});
