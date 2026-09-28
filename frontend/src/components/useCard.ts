import { useRef, useState } from "react";

// Which node's card is open, and whether it is pinned. A hover opens it and
// leaving closes it - after a moment, so the pointer can travel from the node
// to the card without losing it. A click pins it open; it closes by choosing a
// door or pressing anywhere else. One rule for the mouse and for touch, where
// there is no hover and the click is all there is.
export function useCard() {
  const [card, setCard] = useState<{ id: number; pinned: boolean } | null>(
    null,
  );
  const timer = useRef(0);
  const stay = () => window.clearTimeout(timer.current);
  return {
    card,
    // the pointer arrived on a node
    hover: (id: number) => {
      stay();
      setCard((c) => (c?.pinned ? c : { id, pinned: false }));
    },
    // the pointer arrived on the card itself
    stay,
    // the pointer left the node or the card
    leave: () => {
      stay();
      timer.current = window.setTimeout(
        () => setCard((c) => (c?.pinned ? c : null)),
        180,
      );
    },
    pin: (id: number) => {
      stay();
      setCard({ id, pinned: true });
    },
    close: () => {
      stay();
      setCard(null);
    },
  };
}
