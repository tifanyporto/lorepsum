import type { Entity } from "../types";
import { useState } from "react";
import SearchIcon from "./SearchIcon";

function Search({
  entities,
  onSelect,
}: {
  entities: Entity[];
  onSelect: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const results = entities.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="relative flex-1 min-w-0 max-w-sm">
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <SearchIcon />
      </span>
      <input
        type="text"
        className="w-full font-mono text-sm text-ink bg-canvas border border-line rounded pl-2 pr-9 py-2 focus:outline-none focus:border-accent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="what are you looking for?"
      />
      <ul className="absolute top-full left-0 w-full bg-canvas z-10">
        {query &&
          results.map((e) => {
            return (
              <li
                className="list-none cursor-pointer hover:text-accent font-mono text-ink px-3 py-1.5 animate-fade-in"
                key={e.id}
                onClick={() => {
                  (onSelect(e.id), setQuery(""));
                }}
              >
                {e.name}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export default Search;
