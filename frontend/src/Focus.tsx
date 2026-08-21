import { useState, useEffect} from "react"
import type {Entity, Relationship} from "./types"
import ThemeToggle from "./components/ThemeToggle"
import Logo from "./components/Logo"

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
        <div className="min-h-screen bg-canvas">
            <div className="flex justify-between items-center p-4">
                <Logo />
                <ThemeToggle />
            </div>
                <div className="max-w-xl mx-auto px-6 py-16">
                    <h1 className="font-serif text-4xl text-ink">{entity?.name}</h1>
                    <p className="text-muted mt-3">{entity?.description}</p>
                    <div className="border-t border-line mt-8 pt-6">
                        <p className="font-mono text-muted text-xs uppercase tracking-wider mb-4">connections</p>
                    {conn.map((c) =>{
                        const tName = entities.find(e=> e.id === c.target_id)?.name
                        return <p className="mt-2 font-mono text-sm text-muted" key={c.id}>{c.label} → 
                        <a onClick={() => setFocusedId(c.target_id)} className="text-ink hover:text-accent cursor-pointer"> {tName}</a>
                        </p>
                     })}
                    </div>
                </div>
            </div>
    )
}
export default Focus