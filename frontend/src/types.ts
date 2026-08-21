
type EntityType = {
  id: number
  name: string
}

type Entity = {
    id: number
    name: string
    description: string
    entity_type_id: number
}


type Relationship = {
    id: number
    source_id: number
    target_id: number
    label: string
}

export type {Entity, Relationship, EntityType}