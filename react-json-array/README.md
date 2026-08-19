# Printing a JSON array in React

A standalone Vite + React example showing the three usual ways to get a JSON
array onto the page.

```bash
cd react-json-array
npm install
npm run dev
```

| File | What it shows |
| --- | --- |
| `src/RawJson.jsx` | Dump the whole array as text: `<pre>{JSON.stringify(data, null, 2)}</pre>` |
| `src/JsonList.jsx` | One element per item with `.map()` and a stable `key` |
| `src/JsonTable.jsx` | Column names derived from the first object, so any flat array works |
| `src/App.jsx` | Loading/error states around data that arrives asynchronously |

## Things that bite

- `{data}` where `data` is an array of objects throws *"Objects are not valid
  as a React child"*. Stringify it, or map it to elements.
- `key` must be stable and unique among siblings. The array index is fine only
  for a list that never reorders or has items inserted.
- `res.json()` already parses the response — calling `JSON.parse` on its result
  is a double parse and will throw.
- Data from `fetch` is not there on the first render. Initialize state to `[]`
  and guard with `Array.isArray(data)` before mapping.
- Booleans, `null`, and nested objects render as nothing (or throw). Convert
  them to strings before printing, as `formatCell` does.
