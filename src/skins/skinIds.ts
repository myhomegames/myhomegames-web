/** Installed skins use a UUID folder id under METADATA_PATH/skins. */
const SERVER_SKIN_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isServerSkinId(id: string): boolean {
  return typeof id === "string" && SERVER_SKIN_UUID.test(id);
}
