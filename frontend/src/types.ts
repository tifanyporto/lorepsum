type LogoProps = {
  className?: string;
  muted?: boolean;
};

type WordmarkProps = {
  className?: string;
};

type User = {
  id: string;
  name: string;
  self_entity_id: number | null;
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
