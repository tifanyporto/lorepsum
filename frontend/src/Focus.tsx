import { useState, useEffect} from "react"
import type {EntityType, Entity, Relationship, EntityImage} from "./types"
import ThemeToggle from "./components/ThemeToggle"
import Logo from "./components/Logo"
import Search from "./components/Search"
import {API_URL} from "./api"

const CONSTELLATION_BOX_SIZE = 400
const CONSTELLATION_CENTER = CONSTELLATION_BOX_SIZE / 2
const CONSTELLATION_RADIUS = 140



function Focus(){
    const [entityTypes, setEntityTypes] = useState<EntityType[]>([])
    const [entity, setEntity] = useState<Entity>()
    const [entities, setEntiies] = useState<Entity[]>([])
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [focusedId, setFocusedId] = useState(16)
    const [entityImages, setEntityImages] = useState<EntityImage[]>([])

    useEffect(()=> {
        fetch(`${API_URL}/entity-types`)
        .then(res => res.json())
        .then(data => setEntityTypes(data))

        fetch(`${API_URL}/entities`)
        .then(res => res.json())
        .then(data => setEntiies(data))
    }, [])

    useEffect(()=>{
        fetch(`${API_URL}/entities/${focusedId}`)
        .then(res => res.json())
        .then(data => setEntity(data))        

        fetch(`${API_URL}/entities/${focusedId}/relationships`)
        .then(res => res.json())
        .then(data => setRelationships(data))

        fetch(`${API_URL}/entities/${focusedId}/images`)
        .then(res=> res.json())
        .then(data => setEntityImages(data))
        
    }, [focusedId])
    const type =  entityTypes.find(t => t.id === entity?.entity_type_id)
    const coverImage = entityImages.find(i => i.cover)
    const coverUrl = `${API_URL}/media/${coverImage?.path}`
    const gallery = entityImages.filter(g => !g.cover)
    const thumbnailGallery = gallery.slice(0, 5)
    const remainingPhoto = gallery.length - thumbnailGallery.length
    const step = 2 * Math.PI / relationships.length 
    const connections = relationships.map((r, i) => {
        const angle = i * step
        return {
            id: r.id, 
            x: CONSTELLATION_CENTER + Math.cos(angle) * CONSTELLATION_RADIUS, 
            y: CONSTELLATION_CENTER + Math.sin(angle) * CONSTELLATION_RADIUS
        }
    })
    return (
        <div className="min-h-screen bg-canvas">
            <div className="flex items-center justify-between gap-3 p-4">
              <Logo />
              <Search entities={entities} onSelect={setFocusedId} />
              <ThemeToggle />
            </div>
                <div className="max-w-xl mx-auto px-6 py-16">
                    <div className="border border-line rounded relative" style={{width: CONSTELLATION_BOX_SIZE, height: CONSTELLATION_BOX_SIZE}}>             
                        <svg className="absolute top-0 left-0" width={CONSTELLATION_BOX_SIZE} height={CONSTELLATION_BOX_SIZE}>
                            {connections.map((c)=>{                                
                                return <line x1={CONSTELLATION_CENTER} y1={CONSTELLATION_CENTER} x2={c.x} y2={c.y} stroke="var(--color-line)" key={c.id}/>
                            })}
                        </svg>          
                        <div className="absolute w-8 h-8 bg-ink rounded -translate-x-1/2 -translate-y-1/2" style={{left: CONSTELLATION_CENTER, top: CONSTELLATION_CENTER}}>
                        
                        </div>
                        {connections.map((c) =>{
                            return <div className="absolute w-8 h-8 rounded -translate-x-1/2 -translate-y-1/2 bg-desk border border-line" style={{top: c.y, left: c.x}} key={c.id}></div>
                        })}

                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="w-32 h-54 mb-4 border border-line rounded bg-desk overflow-hidden flex shrink-0 items-center justify-center">
                            {coverImage
                                ? <img className="w-full h-full object-cover" src={coverUrl} alt={coverImage.description ?? `${entity?.name}'s cover photo`}/>
                                : <Logo muted className="w-12 h-12"/>}
                        </div>
                    <div>
                        <h2 className="font-mono text-muted text-sm uppercase tracking-wider mb-4">{type?.name}</h2>
                        <h1 className="font-serif text-4xl text-ink">{entity?.name}</h1>
                        <p className="text-muted mt-3">{entity?.description}</p>
                    </div>
                    </div>
                    <div className="border-t border-line mt-8 pt-6">
                        <h3 className="font-mono text-muted text-xs uppercase tracking-wider mb-4">connections</h3>
                    {relationships.map((c) =>{
                        const tName = entities.find(e=> e.id === c.target_id)?.name
                        return <p className="mt-2 font-mono text-lg text-muted" key={c.id}>{c.label} → 
                        <a onClick={() => setFocusedId(c.target_id)} className="text-ink hover:text-accent cursor-pointer"> {tName}</a>
                        </p>
                     })}
                    </div>
                    {gallery.length > 0 &&
                    <div className="border-t border-line mt-8 pt-6 ">
                        <div className="flex justify-between">
                            <h3 className="font-mono text-muted text-xs uppercase tracking-wider mb-4">gallery</h3>
                            <span className="font-mono text-muted text-xs uppercase tracking-wider mb-4">{gallery.length} photos</span>
                        </div>
                        <div className="flex gap-2">                       
                         {thumbnailGallery.map((i) => {
                            const url = `${API_URL}/media/${i.path}`
                            return <img key={i.id} src={url} alt={i.description ?? `${entity?.name}`} className="w-20 h-20 object-cover rounded border border-line" />
                        })}
                        {remainingPhoto > 0 &&
                        <div className="w-20 h-20 rounded border border-dashed border-line flex items-center justify-center bg-desk text-muted">
                        +{remainingPhoto}
                        </div>}
                        </div>
                    </div>}
                </div>
            </div>
    )
}
export default Focus