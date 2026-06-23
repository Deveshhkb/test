import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import FleetCard from '../../components/FleetCard/FleetCard.jsx';
import CtaBand from '../../components/CtaBand/CtaBand.jsx';
import { fleet } from '../../data/fleet.js';
import styles from './Fleet.module.css';

const highlights = [
  { value: '1,450+', label: 'Vehicles' },
  { value: '6', label: 'Vehicle Types' },
  { value: '< 3 yrs', label: 'Avg. Fleet Age' },
  { value: '24/7', label: 'Fleet Monitoring' },
];

export default function Fleet() {
  return (
    <>
      <PageHeader
        title="Our Fleet"
        subtitle="A modern, meticulously maintained fleet engineered to carry any load, anywhere."
        breadcrumb={['Fleet']}
      />

      {/* Highlights */}
      <section className="section--tight">
        <div className="container">
          <div className={styles.highlights}>
            {highlights.map((h) => (
              <div key={h.label} className={styles.highlight}>
                <strong>{h.value}</strong>
                <span>{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Vehicle Types"
            title="The Right Vehicle for Every Shipment"
            subtitle="Explore our diverse fleet, each vehicle purpose-built for its job and tracked in real time."
          />
          <div className={styles.grid}>
            {fleet.map((vehicle, i) => (
              <FleetCard key={vehicle.id} vehicle={vehicle} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Capacity table */}
      <section className="section section--alt">
        <div className="container">
          <SectionHeading
            eyebrow="Capacity Details"
            title="Vehicle Specifications at a Glance"
            subtitle="Compare payloads and use-cases to choose the ideal vehicle for your cargo."
          />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Type</th>
                  <th scope="col">Max Capacity</th>
                  <th scope="col">Configuration</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Vehicle"><strong>{v.name}</strong></td>
                    <td data-label="Type">{v.type}</td>
                    <td data-label="Max Capacity">{v.capacity}</td>
                    <td data-label="Configuration">{v.axles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CtaBand
        title="Need a dedicated vehicle for your route?"
        text="Talk to our fleet team about dedicated, contract and seasonal transport solutions."
      />
    </>
  );
}
