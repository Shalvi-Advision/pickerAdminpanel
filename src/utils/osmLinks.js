export function osmPointUrl(lat, lng) {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=16/${la}/${lo}`;
}

export function osmDirectionsUrl(points) {
  if (!points?.length) return null;
  const routeParam = points.map((p) => `${p.lat},${p.lng}`).join(";");
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${routeParam}`;
}
