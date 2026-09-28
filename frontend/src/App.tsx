import { useState, useEffect, useMemo } from "react";
import type { User, EntityType, Entity, Relationship } from "./types";
import { fetchJson } from "./api";
import { layoutConstellation } from "./graph/layout";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";
import Wordmark from "./components/Wordmark";
import Search from "./components/Search";
import Constellation from "./components/Constellation";
import Focus from "./components/Focus";

function App() {
  const [user, setUser] = useState<User>();
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [arrivalGloss, setArrivalGloss] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<User>("/users/me")
      .then((data) => {
        setUser(data);
        setFocusedId(data.self_entity_id);
      })
      .catch((error) => console.error(error));
    fetchJson<EntityType[]>("/entity-types")
      .then((data) => setEntityTypes(data))
      .catch((error) => console.error(error));
    fetchJson<Entity[]>("/entities")
      .then((data) => setEntities(data))
      .catch((error) => console.error(error));
    fetchJson<Relationship[]>("/relationships")
      .then((data) => setAllRelationships(data))
      .catch((error) => console.error(error));
  }, []);

  const selfId = user?.self_entity_id;
  const layout = useMemo(
    () =>
      layoutConstellation(
        entities.filter((e) => e.id !== selfId),
        allRelationships,
      ),
    [entities, allRelationships, selfId],
  );

  const focus = (id: number, gloss: string | null) => {
    setFocusedId(id);
    setArrivalGloss(gloss);
  };

  return (
    <div className="h-screen relative overflow-hidden bg-desk">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 p-4 pointer-events-none *:pointer-events-auto">
        {/* lockup: symbol + wordmark, the symbol matching the text box height */}
        <a
          href="/"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="lorepsum"
        >
          <Logo className="w-10 h-10" />
          <Wordmark />
        </a>
        <div className="w-full">
          <Search entities={entities} onSelect={(id) => focus(id, null)} />
        </div>
        <ThemeToggle />
      </div>
      <Constellation
        layout={layout}
        selfId={selfId}
        allRelationships={allRelationships}
        focusedId={focusedId}
        onFocus={focus}
      />
      <div className="absolute top-17 right-12 bottom-5 z-10 w-105 overflow-y-auto scrollbar-accent rounded-xl border border-line bg-canvas px-6 py-7">
        <Focus
          focusedId={focusedId}
          arrivalGloss={arrivalGloss}
          selfId={selfId}
          entities={entities}
          entityTypes={entityTypes}
          allRelationships={allRelationships}
          onSelect={focus}
        />
      </div>
    </div>
  );
}

export default App;
