/**
 * Dummy shipment tracking dataset + a mock async "API".
 * Try tracking IDs:  SL123456789 , SL987654321 , SL555000111
 */

export const shipments = {
  SL123456789: {
    trackingId: 'SL123456789',
    status: 'In Transit',
    service: 'Road Freight — FTL',
    origin: 'Long Beach, CA',
    destination: 'Chicago, IL',
    currentLocation: 'Denver, CO Distribution Hub',
    estimatedDelivery: 'June 26, 2026',
    weight: '18,400 kg',
    timeline: [
      { label: 'Order Placed', location: 'Long Beach, CA', date: 'Jun 21, 2026 · 08:14', done: true },
      { label: 'Picked Up', location: 'Long Beach, CA', date: 'Jun 21, 2026 · 14:02', done: true },
      { label: 'In Transit', location: 'Denver, CO', date: 'Jun 23, 2026 · 09:30', done: true, current: true },
      { label: 'Out for Delivery', location: 'Chicago, IL', date: 'Pending', done: false },
      { label: 'Delivered', location: 'Chicago, IL', date: 'Pending', done: false },
    ],
  },
  SL987654321: {
    trackingId: 'SL987654321',
    status: 'Delivered',
    service: 'Express Delivery',
    origin: 'Newark, NJ',
    destination: 'Boston, MA',
    currentLocation: 'Delivered — Boston, MA',
    estimatedDelivery: 'June 22, 2026',
    weight: '420 kg',
    timeline: [
      { label: 'Order Placed', location: 'Newark, NJ', date: 'Jun 20, 2026 · 10:05', done: true },
      { label: 'Picked Up', location: 'Newark, NJ', date: 'Jun 20, 2026 · 16:40', done: true },
      { label: 'In Transit', location: 'Hartford, CT', date: 'Jun 21, 2026 · 07:12', done: true },
      { label: 'Out for Delivery', location: 'Boston, MA', date: 'Jun 22, 2026 · 08:55', done: true },
      { label: 'Delivered', location: 'Boston, MA', date: 'Jun 22, 2026 · 13:21', done: true, current: true },
    ],
  },
  SL555000111: {
    trackingId: 'SL555000111',
    status: 'Customs Clearance',
    service: 'Sea Freight — FCL',
    origin: 'Shanghai, CN',
    destination: 'Los Angeles, CA',
    currentLocation: 'Port of Los Angeles — Customs',
    estimatedDelivery: 'June 29, 2026',
    weight: '21,000 kg',
    timeline: [
      { label: 'Booking Confirmed', location: 'Shanghai, CN', date: 'Jun 05, 2026 · 11:00', done: true },
      { label: 'Departed Origin Port', location: 'Shanghai, CN', date: 'Jun 08, 2026 · 22:30', done: true },
      { label: 'Arrived Destination Port', location: 'Los Angeles, CA', date: 'Jun 23, 2026 · 05:10', done: true },
      { label: 'Customs Clearance', location: 'Los Angeles, CA', date: 'Jun 23, 2026 · 10:45', done: true, current: true },
      { label: 'Out for Delivery', location: 'Los Angeles, CA', date: 'Pending', done: false },
      { label: 'Delivered', location: 'Los Angeles, CA', date: 'Pending', done: false },
    ],
  },
};

/**
 * Simulates a network request to a tracking API.
 * Resolves with the shipment, or rejects with a not-found error.
 */
export function fetchShipment(trackingId) {
  const id = String(trackingId || '').trim().toUpperCase();
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const shipment = shipments[id];
      if (shipment) {
        resolve(shipment);
      } else {
        reject(new Error('No shipment found for that tracking ID. Try SL123456789.'));
      }
    }, 900);
  });
}
