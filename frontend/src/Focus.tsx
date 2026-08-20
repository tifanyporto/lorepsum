import { useState, useEffect } from "react"

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

function Focus(){
    const [entity, setEntity] = useState<Entity>()
    const [entities, setEntiies] = useState<Entity[]>([])
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [focusedId, setFocusedId] = useState(16)

    useEffect(()=>{
        fetch('http://localhost:8000/entities')
        .then(res => res.json())
        .then(data => setEntiies(data))

        fetch(`http://localhost:8000/entities/${focusedId}`)
        .then(res => res.json())
        .then(data => setEntity(data))
        
        fetch(`http://localhost:8000/relationships/`)
        .then(res => res.json())
        .then(data => setRelationships(data))        
        
    }, [focusedId])
    const conn = relationships.filter( r => r.source_id === entity?.id)
    return (
    <>
        {entity?.name} - {entity?.description}
        {conn.map((c) =>{
            const tName = entities.find(e=> e.id === c.target_id)?.name
            return <p key={c.id} onClick={() => setFocusedId(c.target_id)}>{c.label} {tName}</p>
        })}
    </>
    )
}

export default Focus