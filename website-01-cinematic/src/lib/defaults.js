// What the website shows for each slot until the admin replaces it (Site media page).
const img = (n) => `/images/massup-${n}.jpg`
const RIBBON = ['02-nuts-flying', '03-powder-scoop', '05-shake-swirl', '08-pistachio-macro', '09-lid-closeup', '10-lid-open', '11-jar-bowl']
const GALLERY = ['02-nuts-flying', '06-jar-garden', '09-lid-closeup', '03-powder-scoop', '07-jar-orbit', '10-lid-open', '04-shake-pour', '11-jar-bowl', '08-pistachio-macro']
const STORY = ['02-nuts-flying', '08-pistachio-macro', '03-powder-scoop', '10-lid-open', '04-shake-pour']
const SPOT = ['01-jar-hero', '05-shake-swirl', '06-jar-garden', '07-jar-orbit']

export const DEFAULT_MEDIA = {
  hero_video: '/videos/vid1.mp4',
  hero_float_1: img('08-pistachio-macro'),
  hero_float_2: img('02-nuts-flying'),
  showcase_video: '/videos/vid2.mp4',
  ...Object.fromEntries(STORY.map((n, i) => [`story_${i + 1}`, img(n)])),
  ...Object.fromEntries(SPOT.map((n, i) => [`spot_${i + 1}`, img(n)])),
  ...Object.fromEntries(GALLERY.map((n, i) => [`gallery_${i + 1}`, img(n)])),
  ...Object.fromEntries(RIBBON.map((n, i) => [`ribbon_${i + 1}`, img(n)])),
}
