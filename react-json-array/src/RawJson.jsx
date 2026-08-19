// 1. Print the array as raw JSON text.
//
// Rendering an array/object directly ({users}) throws
// "Objects are not valid as a React child" — you must stringify it first.
// JSON.stringify(value, replacer, space) with space = 2 pretty-prints it,
// and <pre> keeps the newlines and indentation.
export default function RawJson({ data }) {
  return (
    <section>
      <h2>Raw JSON</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}
