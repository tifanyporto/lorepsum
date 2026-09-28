type LogoProps = {
  className?: string;
  muted?: boolean;
};

type WordmarkProps = {
  className?: string;
};

// no name: the name is the you-node's, read from its entity
type User = {
  id: string;
  self_entity_id: number | null;
  birth_date_id: number | null;
};

type EntityType = {
  id: number;
  name: string;
};

type Entity = {
  id: number;
  name: string;
  description: string | null;
  entity_type_id: number;
};

type Relationship = {
  id: number;
  source_id: number;
  target_id: number;
  label: string | null;
  gloss: string | null;
};

type EntityImage = {
  id: number;
  entity_id: number;
  path: string;
  cover: boolean;
  description: string | null;
};

export type {
  LogoProps,
  WordmarkProps,
  User,
  Entity,
  Relationship,
  EntityType,
  EntityImage,
};
