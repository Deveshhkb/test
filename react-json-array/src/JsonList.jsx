// 2. Render one element per array item with .map().
//
// - .map() returns an array of elements, which React renders in order.
// - Every item needs a stable `key` so React can match elements across
//   re-renders. Use a real id when you have one; the array index is a last
//   resort and breaks on reorder/insert.
// - Guard against a missing or non-array value before mapping — data that
//   arrives from fetch() is undefined on the first render.
export default function JsonList({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p>No records.</p>;
  }

  return (
    <section>
      <h2>As a list</h2>
      <ul>
        {data.map((user) => (
          <li key={user.id}>
            {user.name} — {user.role} {user.active ? "(active)" : "(inactive)"}
          </li>
        ))}
      </ul>
    </section>
  );
}
