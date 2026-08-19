// 3. Render an array of objects as a table without hard-coding the columns.
//
// Object.keys() of the first row gives the column names, so the same
// component works for any array of flat objects.
export default function JsonTable({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p>No records.</p>;
  }

  const columns = Object.keys(data[0]);

  return (
    <section>
      <h2>As a table</h2>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => (
                // Values can be booleans/objects, which React will not render
                // as-is, so stringify anything that is not a string or number.
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
