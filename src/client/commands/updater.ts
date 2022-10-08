export async function checkUpdates() {
  await electronUtils.selfUpdate();
}
