/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoicmlhZGRldiIsImEiOiJjbTM0NTd1MXYxb2dyMmlzODZuN3Z4Z2FvIn0.lvhbPPErxE_2rzy3Rj99VA";
  const map = new mapboxgl.Map({
    container: "map", // container ID
    style: "mapbox://styles/riaddev/cmcr9gvw7022r01qx5lwn5r45",
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement("div");
    el.className = "marker";

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Extends map bounds to include current location
    bounds.extend(loc.coordinates);

    // Add a popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
  });

  map.fitBounds(bounds, {
    padding: { top: 200, bottom: 150, left: 100, right: 100 },
  });
};
