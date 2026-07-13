// Fixed, theme-independent cat palette. An orange tabby reads the same on a
// cream or a dark background, so the avatar can be cached once (see avatarImage).
export const palette = {
  K: '#3D2817',  // dark outline
  O: '#E0884A',  // base orange (matches --primary)
  H: '#F4B777',  // highlight
  S: '#AC5A26',  // stripe / shadow
  C: '#F8E6CC',  // cream (muzzle, chest, paws)
  P: '#E89AA0',  // pink (inner ear, nose, tongue)
  G: '#7FBF5B',  // eye green
  GD: '#5C8F3E', // eye green, darker lower iris
  D: '#241307',  // pupil / mouth dark
  W: '#FFFFFF',  // glint white
  WI: '#FBF1E0', // wing inner
  WS: '#E6D2B4', // wing shadow / feather lines
} as const;
