import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no WebGL, which crashes MapLibre. Mock the module out — we don't
// need actual map rendering during unit / integration tests.
vi.mock('maplibre-gl', () => {
  class FakeMap {
    on() {}
    off() {}
    remove() {}
    addSource() {}
    addLayer() {}
    getSource() { return null; }
    setLayoutProperty() {}
    setPaintProperty() {}
    easeTo() {}
    fitBounds() {}
    flyTo() {}
    setCenter() {}
    setZoom() {}
  }
  class FakeMarker {
    setLngLat() { return this; }
    setRotation() { return this; }
    addTo() { return this; }
    remove() {}
  }
  class FakeLngLatBounds {}
  return {
    default: {
      Map: FakeMap,
      Marker: FakeMarker,
      LngLatBounds: FakeLngLatBounds,
    },
    Map: FakeMap,
    Marker: FakeMarker,
    LngLatBounds: FakeLngLatBounds,
  };
});
