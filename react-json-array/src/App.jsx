import { useEffect, useState } from "react";
import { users } from "./data.js";
import RawJson from "./RawJson.jsx";
import JsonList from "./JsonList.jsx";
import JsonTable from "./JsonTable.jsx";

export default function App() {
  const data = useJsonArray();

  if (data.loading) return <p>Loading…</p>;
  if (data.error) return <p>Failed to load: {data.error.message}</p>;

  return (
    <main>
      <h1>Printing a JSON array in React</h1>
      <RawJson data={data.items} />
      <JsonList data={data.items} />
      <JsonTable data={data.items} />
    </main>
  );
}

// Stands in for a real fetch. Swap the body for:
//
//   fetch("/api/users")
//     .then((res) => res.json())            // already parsed — no JSON.parse
//     .then((json) => setState({ items: json, loading: false, error: null }))
//     .catch((error) => setState({ items: [], loading: false, error }));
//
// The important part is that `items` starts as [] rather than undefined, so
// the first render can call .map() without a guard blowing up.
function useJsonArray() {
  const [state, setState] = useState({
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setState({ items: users, loading: false, error: null });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return state;
}
