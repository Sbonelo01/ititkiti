export function buildGoogleMapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
}

export function buildAppleMapsSearchUrl(location: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(location.trim())}`;
}
