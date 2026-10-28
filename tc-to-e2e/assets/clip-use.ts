/**
 * `test.use` options for specs whose clips go into the evidence report: 1920x1080 page and
 * video, recorded per `E2E_VIDEO` (`all` / `failures`; unset = no video, and StepEvidence
 * records nothing). Set the time zone and locale your users see so dates on screen match.
 *
 *   test.use(clipUse({ timezoneId: 'Asia/Bangkok', locale: 'th-TH' }))
 */
const CLIP = { width: 1920, height: 1080 }

const videoMode =
  process.env.E2E_VIDEO === 'all'
    ? ('on' as const)
    : process.env.E2E_VIDEO === 'failures'
      ? ('retain-on-failure' as const)
      : ('off' as const)

export const clipUse = (place: { timezoneId: string; locale: string }) => ({
  viewport: CLIP,
  video: { mode: videoMode, size: CLIP },
  ...place,
})
