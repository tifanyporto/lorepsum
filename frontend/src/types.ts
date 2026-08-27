type LogoProps = {
    className?: string,
    muted?: boolean
}

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

type EntityImage = {
    id: number
    entity_id: number
    path: string
    cover: boolean
    description: string
}

export type {LogoProps, Entity, Relationship, EntityType, EntityImage}