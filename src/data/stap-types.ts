/** Per-place metadata for the Stap Kaap notebook: the extra line a place
 *  carries in a collected card that the atlas itself does not need. */

export interface StapMeta {
  /** The single year that anchors this place in a list. */
  year: string;
  /** One short line for a notebook list row. */
  caption: string;
  /** A 1-3 character stamp glyph for the collected card. */
  stamp: string;
}
