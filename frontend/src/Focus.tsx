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
    const [entities, setEntities] = useState<Entity>()
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [focusedId, setFocusedId] = useState(16)

    useEffect(()=>{
        fetch(`http://localhost:8000/entities/${focusedId}`)
        .then(res => res.json())
        .then(data => setEntities(data))
        
        fetch(`http://localhost:8000/relationships/`)
        .then(res => res.json())
        .then(data => setRelationships(data))        
        
    }, [focusedId])
    const conn = relationships.filter( r => r.source_id === entities?.id)
    
    return <>
        {entities?.name} - {entities?.description}
        {conn.map(c => <p key={c.id} onClick={() => setFocusedId(c.target_id)}>{c.label} {c.target_id}</p>)}
    </>
}

export default Focus