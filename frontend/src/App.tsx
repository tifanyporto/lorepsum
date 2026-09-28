import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type {
  User,
  EntityType,
  Entity,
  Relationship,
  Lore,
  Membership,
} from "./types";
import { fetchJson } from "./api";
import { EMPTY_LAYOUT, layoutConstellation, type Layout } from "./graph/layout";
import { layoutSky } from "./graph/sky";
import { crossingCamera } from "./graph/camera";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";
import Wordmark from "./components/Wordmark";
import Search from "./components/Search";
import Constellation from "./components/Constellation";
import Focus from "./components/Focus";
import LorePanel from "./components/LorePanel";
import Sky, { type Passage, type SkyView } from "./components/Sky";
import Crossing from "./components/Crossing";
import type { Door } from "./components/LoreCard";

// where you are: the sky of lores, or inside one of them
type Place = { kind: "sky" } | { kind: "lore"; loreId: number };

// a dive or a rise, and what to focus when a dive lands
type Journey = Passage & { focusAfter: number | null; glossAfter: string | null };

// a crossing from one lore into another, anchored on the entity it goes
// through, from where the camera stood
type CrossingState = {
  from: number;
  to: number;
  anchorId: number;
  camera: { pan: { x: number; y: number }; zoom: number };
};

const PASSAGE_MS = 1100;
const CROSSING_MS = 1000;

// The first visit opens on the Nebula; every visit after that, on the sky.
// Read once, when the app loads - React may run the loading effect twice, and
// the second run must not see a visit the first one just recorded. Kept in
// the browser until accounts have sessions (#14), when it belongs to the
// account.
const FIRST_VISIT = (() => {
  try {
    const first = localStorage.getItem("lorepsum:visited") === null;
    localStorage.setItem("lorepsum:visited", "1");
    return first;
  } catch {
    return false;
  }
})();

function App() {
  const [user, setUser] = useState<User>();
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [lores, setLores] = useState<Lore[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  // the entity in focus inside a lore
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [arrivalGloss, setArrivalGloss] = useState<string | null>(null);
  // the lore in focus in the sky; null is you
  const [skyFocus, setSkyFocus] = useState<number | null>(null);
  const [skyView, setSkyView] = useState<SkyView>({ x: 0, y: 0, zoom: 1 });
  const [journey, setJourney] = useState<Journey | null>(null);
  const [progress, setProgress] = useState(0);
  const [crossing, setCrossing] = useState<CrossingState | null>(null);
  // where the constellation of a lore just crossed into starts its camera
  const [arrivalCamera, setArrivalCamera] = useState<{
    pan: { x: number; y: number };
    zoom: number;
  }>();
  // the constellation's camera, for a rise to start where it stands
  const insideCamera = useRef({ pan: { x: 0, y: 0 }, zoom: 1 });
  const reportCamera = useCallback(
    (camera: { pan: { x: number; y: number }; zoom: number }) => {
      insideCamera.current = camera;
    },
    [],
  );

  useEffect(() => {
    fetchJson<User>("/users/me")
      .then((data) => {
        setUser(data);
        setFocusedId(data.self_entity_id);
        setPlace(
          FIRST_VISIT && data.nebula_lore_id != null
            ? { kind: "lore", loreId: data.nebula_lore_id }
            : { kind: "sky" },
        );
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
    fetchJson<Lore[]>("/lores")
      .then((data) => setLores(data))
      .catch((error) => console.error(error));
    fetchJson<Membership[]>("/lores/memberships")
      .then((data) => setMemberships(data))
      .catch((error) => console.error(error));
  }, []);

  const selfId = user?.self_entity_id;
  // every lore's constellation, computed once: the sky draws each one in
  // miniature and a dive lands on the very same positions
  const layouts = useMemo(() => {
    const byLore = new Map<number, Layout>();
    for (const lore of lores) {
      const ids = new Set(
        memberships.filter((m) => m.lore_id === lore.id).map((m) => m.entity_id),
      );
      byLore.set(
        lore.id,
        layoutConstellation(
          entities.filter((e) => ids.has(e.id) && e.id !== selfId),
          allRelationships,
          // everyone else may turn up at the border
          entities.filter((e) => e.id !== selfId),
        ),
      );
    }
    return byLore;
  }, [lores, memberships, entities, allRelationships, selfId]);
  const sky = useMemo(
    () => layoutSky(lores, layouts, memberships, allRelationships, selfId),
    [lores, layouts, memberships, allRelationships, selfId],
  );
  // the lores each entity lives in, and how many entities two lores share
  const { loresOf, shared } = useMemo(() => {
    const loresOf = new Map<number, number[]>();
    for (const m of memberships)
      loresOf.set(m.entity_id, [...(loresOf.get(m.entity_id) ?? []), m.lore_id]);
    const shared = new Map<string, number>();
    for (const ids of loresOf.values())
      for (const a of ids)
        for (const b of ids)
          if (a !== b) shared.set(`${a}-${b}`, (shared.get(`${a}-${b}`) ?? 0) + 1);
    return { loresOf, shared };
  }, [memberships]);
  // The doors on an entity's card: the lores it lives in, other than the one
  // open. Inside a lore, those sharing the most with it come first - the
  // likeliest doors on top; in the sky, the lores that are most yours.
  const homesOf = (entityId: number, open: number | null): Door[] =>
    (loresOf.get(entityId) ?? [])
      .filter((id) => id !== open)
      .map((id) => ({
        id,
        name: lores.find((l) => l.id === id)?.name ?? "",
        weight:
          open === null
            ? (sky.lores.find((s) => s.lore.id === id)?.yours ?? 0)
            : (shared.get(`${open}-${id}`) ?? 0),
      }))
      .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

  // a passage runs on its own clock; when a dive ends, the lore takes over
  useEffect(() => {
    if (journey === null) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / PASSAGE_MS);
      setProgress(t);
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      if (journey.kind === "dive") {
        setPlace({ kind: "lore", loreId: journey.loreId });
        setFocusedId(journey.focusAfter ?? selfId ?? null);
        setArrivalGloss(journey.glossAfter);
      }
      setJourney(null);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [journey, selfId]);

  // a crossing runs on its own clock too; when it ends, the new lore takes
  // over with the anchor in focus, exactly where it stood
  useEffect(() => {
    if (crossing === null) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / CROSSING_MS);
      setProgress(t);
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      setArrivalCamera(
        crossingCamera(
          layouts.get(crossing.from) ?? EMPTY_LAYOUT,
          layouts.get(crossing.to) ?? EMPTY_LAYOUT,
          crossing.anchorId,
          crossing.camera,
        ),
      );
      setPlace({ kind: "lore", loreId: crossing.to });
      setFocusedId(crossing.anchorId);
      setArrivalGloss(null);
      setCrossing(null);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [crossing, layouts]);

  const focus = (id: number, gloss: string | null) => {
    setFocusedId(id);
    setArrivalGloss(gloss);
  };
  const dive = (
    loreId: number,
    focusAfter: number | null = null,
    glossAfter: string | null = null,
  ) => {
    if (journey !== null || crossing !== null) return;
    setArrivalCamera(undefined);
    setProgress(0);
    setJourney({
      kind: "dive",
      loreId,
      inside: { pan: { x: 0, y: 0 }, zoom: 1 },
      focusAfter,
      glossAfter,
    });
  };
  const rise = () => {
    if (place?.kind !== "lore" || journey !== null || crossing !== null) return;
    setProgress(0);
    setSkyFocus(place.loreId);
    setPlace({ kind: "sky" });
    setJourney({
      kind: "rise",
      loreId: place.loreId,
      inside: insideCamera.current,
      focusAfter: null,
      glossAfter: null,
    });
  };
  // Opening an entity from the search or from your card in the sky. Inside a
  // lore that holds it, it is a focus; anywhere else it goes to the lore that
  // is most yours among those that hold it - a dive from the sky, a plain
  // switch from inside another lore.
  const openEntity = (id: number, gloss: string | null) => {
    if (id === selfId) {
      if (place?.kind === "sky") setSkyFocus(null);
      else focus(id, gloss);
      return;
    }
    if (
      place?.kind === "lore" &&
      layouts.get(place.loreId)?.nodes.some((n) => n.id === id)
    ) {
      focus(id, gloss);
      return;
    }
    const home = sky.lores
      .filter((s) => s.layout.nodes.some((n) => n.id === id))
      .sort((a, b) => b.yours - a.yours)[0];
    if (home === undefined) return;
    if (place?.kind === "sky") {
      dive(home.lore.id, id, gloss);
    } else {
      setArrivalCamera(undefined);
      setPlace({ kind: "lore", loreId: home.lore.id });
      focus(id, gloss);
    }
  };
  // a door on a border card: cross into that lore through the entity
  const cross = (entityId: number, to: number) => {
    if (place?.kind !== "lore" || journey !== null || crossing !== null) return;
    setProgress(0);
    setCrossing({
      from: place.loreId,
      to,
      anchorId: entityId,
      camera: insideCamera.current,
    });
  };

  const openLore =
    place?.kind === "lore" ? lores.find((l) => l.id === place.loreId) : undefined;
  const focusedSkyLore =
    skyFocus === null
      ? undefined
      : sky.lores.find((s) => s.lore.id === skyFocus);
  // the sky stays on screen for the whole of a passage, in either direction
  const showSky = place?.kind === "sky" || journey !== null;

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
        {/* where you are, beside the name of the place it all belongs to.
            Inside a lore, "lores" is the way back up. */}
        <nav className="mr-auto ml-3 flex items-baseline gap-2 min-w-0">
          {openLore && journey === null ? (
            <>
              <button
                onClick={rise}
                className="shrink-0 font-mono text-muted text-[11px] uppercase tracking-[0.22em] cursor-pointer hover:text-here transition-colors"
              >
                lores
              </button>
              <span className="shrink-0 font-mono text-line text-[11px]">/</span>
              <span className="font-serif text-ink text-[16px] truncate">
                {openLore.name}
              </span>
            </>
          ) : (
            <span className="font-mono text-ink text-[11px] uppercase tracking-[0.22em]">
              lores
            </span>
          )}
        </nav>
        <ThemeToggle />
      </div>
      {/* the search sits over the panel: finding is the first half of
          reading, and it takes the panel's column, never the map's */}
      <div className="absolute top-4 right-16 z-20 w-101">
        <Search entities={entities} onSelect={(id) => openEntity(id, null)} />
      </div>

      {showSky && (
        <Sky
          sky={sky}
          selfId={selfId}
          allRelationships={allRelationships}
          focusedLoreId={skyFocus}
          view={skyView}
          onView={setSkyView}
          onFocusLore={setSkyFocus}
          onEnter={(id) => dive(id)}
          homesOf={(id) => homesOf(id, null)}
          onOpen={(entityId, loreId) => dive(loreId, entityId)}
          passage={journey}
          progress={progress}
        />
      )}
      {crossing !== null && (
        <Crossing
          from={layouts.get(crossing.from) ?? EMPTY_LAYOUT}
          to={layouts.get(crossing.to) ?? EMPTY_LAYOUT}
          anchorId={crossing.anchorId}
          anchorName={
            entities.find((e) => e.id === crossing.anchorId)?.name ?? ""
          }
          camera={crossing.camera}
          progress={progress}
        />
      )}
      {!showSky && crossing === null && place?.kind === "lore" && (
        <Constellation
          key={place.loreId}
          layout={layouts.get(place.loreId) ?? EMPTY_LAYOUT}
          selfId={selfId}
          allRelationships={allRelationships}
          focusedId={focusedId}
          onFocus={focus}
          onCamera={reportCamera}
          homesOf={(id) => homesOf(id, place.loreId)}
          onCross={cross}
          initialCamera={arrivalCamera}
        />
      )}

      <div className="absolute top-17 right-12 bottom-5 z-10 w-105 overflow-y-auto scrollbar-accent rounded-xl border border-line bg-canvas px-6 py-7">
        {showSky && focusedSkyLore ? (
          <LorePanel
            key={focusedSkyLore.lore.id}
            skyLore={focusedSkyLore}
            sky={sky}
            entities={entities}
            entityTypes={entityTypes}
            onEnter={() => dive(focusedSkyLore.lore.id)}
            onFocusLore={setSkyFocus}
          />
        ) : (
          <Focus
            focusedId={showSky ? (selfId ?? null) : focusedId}
            arrivalGloss={showSky ? null : arrivalGloss}
            selfId={selfId}
            entities={entities}
            entityTypes={entityTypes}
            allRelationships={allRelationships}
            onSelect={showSky ? openEntity : focus}
            isOutside={
              openLore
                ? (id) =>
                    !layouts
                      .get(openLore.id)
                      ?.nodes.some((n) => n.id === id)
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

export default App;
