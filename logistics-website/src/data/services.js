import {
  FaTruckMoving,
  FaPlaneDeparture,
  FaShip,
  FaWarehouse,
  FaShippingFast,
  FaMapMarkedAlt,
} from 'react-icons/fa';

export const services = [
  {
    id: 'road-transport',
    Icon: FaTruckMoving,
    title: 'Road Transport',
    description:
      'Nationwide full-truckload and less-than-truckload road freight backed by a GPS-tracked fleet and on-time delivery guarantees.',
    features: ['FTL & LTL freight', 'Refrigerated transport', 'Last-mile distribution'],
  },
  {
    id: 'air-freight',
    Icon: FaPlaneDeparture,
    title: 'Air Freight',
    description:
      'Time-critical air cargo to 200+ destinations with priority customs clearance and door-to-door coordination.',
    features: ['Express & economy air', 'Customs brokerage', 'Temperature-controlled ULD'],
  },
  {
    id: 'sea-freight',
    Icon: FaShip,
    title: 'Sea Freight',
    description:
      'Cost-effective FCL and LCL ocean shipping with consolidated routes across every major trade lane worldwide.',
    features: ['FCL & LCL containers', 'Port-to-port & door-to-door', 'Reefer & breakbulk'],
  },
  {
    id: 'warehouse',
    Icon: FaWarehouse,
    title: 'Warehouse Services',
    description:
      'Smart, secure warehousing with real-time inventory management, pick-and-pack fulfilment and cross-docking.',
    features: ['Inventory management', 'Pick, pack & fulfil', 'Climate-controlled storage'],
  },
  {
    id: 'express-delivery',
    Icon: FaShippingFast,
    title: 'Express Delivery',
    description:
      'Same-day and next-day express courier services for urgent shipments with live driver tracking.',
    features: ['Same-day delivery', 'Scheduled couriers', 'Proof of delivery'],
  },
  {
    id: 'cargo-tracking',
    Icon: FaMapMarkedAlt,
    title: 'Cargo Tracking',
    description:
      'End-to-end shipment visibility with real-time GPS tracking, milestone alerts and a self-service portal.',
    features: ['Live GPS tracking', 'Milestone notifications', 'API & EDI integration'],
  },
];
