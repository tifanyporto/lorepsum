import { useState, useEffect } from 'react'
import './App.css'
import type { Entity, EntityType, Relationship } from './types'


function EntityCard(
  {
  entity, 
  typeName, 
  sourceLabel,
  targetName,
  onDelete,
  onEdit
}:
{
  entity: Entity, 
  typeName?: string, 
  sourceLabel?: string[]
  targetName?: string[]
  onDelete: (id: number) => void,
  onEdit:(entity: Entity) => void
}) { 
  return <li className='p-3 m-4 rounded-lg border border-gray-200 bg-white shadow-sm'>
    <span className='font-medium'>{entity.name}</span>{' '}
    <span className='font-medium text-gray-500'>{sourceLabel} </span>
    <span className='font-medium text-gray-500'>{targetName} </span>
    <span className='font-medium text-gray-500'>({typeName})</span>{' '}
    <button className='ml-2 text-sm text-gray-400 hover:text-red-600' onClick={() => onDelete(entity.id)}>delete</button>
    <button className='ml-2 text-sm text-gray-400 hover:text-red-600' onClick={() => onEdit(entity)}>edit</button>
  </li>
}


function App() {
  //const entities: Entity[] = [ {name: 'Batman', kind: 'Character'}]
  const [entities, setEntities] = useState<Entity[]>([])
  const [types, setTypes] = useState<EntityType[]>([])
  const [ newName, setNewName] = useState('')
  const [ newTypeId, setNewTypeId] = useState('')
  const [ editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [newSourceId, setNewSourceId] = useState('')
  const [newTargetId, setNewTargetId] = useState('')
  const [newLabel, setNewLabel] = useState('')

  useEffect(()=> {
    fetch('http://localhost:8000/entities')
    .then(res => res.json())
    .then(data => {
      setEntities(data)
      setLoading(false)
    })
    .catch(() =>{
      setError(true)
      setLoading(false)
    } )
    fetch("http://localhost:8000/entity-types")
    .then(res => res.json())
    .then(data => setTypes(data))

    fetch('http://localhost:8000/relationships')
    .then(res => res.json())
    .then(data => {
      setRelationships(data)
    })
  }, [])

  function handleDelete(id:number) {
    fetch(`http://localhost:8000/entities/${id}`, {method: 'DELETE'})
    .then(() => setEntities(entities.filter( e => e.id !== id)))
  }

  function handleEdit(entity: Entity){
    setNewName(entity.name)
    setNewTypeId(String(entity.entity_type_id))
    setEditingId(entity.id)
  }

  function handleCancel() {
    setNewName('')
    setNewTypeId('')
    setEditingId(null)
  }

  return (
        <div className='max-w-md mx-auto p-6'>
          <h1 className='text-3xl font-bold text-blue-500'>lorepsum</h1>
          <p>The story is about to begin.</p>
         <form className='flex gap-2 mb-4' onSubmit={(e) => 
          {
            e.preventDefault()
            if(editingId != null){
              fetch(`http://localhost:8000/entities/${editingId}`,{
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({name: newName, entity_type_id: Number(newTypeId)})
              })
              .then(res => res.json())
            .then( updated => {
              setEntities(entities.map(e => e.id === editingId ? updated : e))
              setNewName('')
              setNewTypeId('')
              setEditingId(null)
            })
            }else {
            fetch('http://localhost:8000/entities', {
              method: 'POST',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({name: newName, entity_type_id: Number(newTypeId)})
            })
            .then(res => res.json())
            .then(created => {
              setEntities([...entities, created])
              setNewName('')
              setNewTypeId('')
            })
          }
          }}>
          <input className="border border-gray-300 rounded px-2 py-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='name' />
          <select className="border border-gray-300 rounded px-2 py-1" value={newTypeId} onChange={e => setNewTypeId(e.target.value)}>
            <option value="">type...</option>
            {types.map(t=> <option value={t.id} key={t.id}>{t.name}</option>)}
          </select>

          <button className="bg-blue-500 text-white rounded px-3 py-1 hover:bg-blue-600 whitespace-nowrap" type='submit'>add entity</button>
          {editingId && <button type='button' className='bg-red-500 text-white rounded px-3 py-1 hover:bg-red-600 whitespace-nowrap' onClick={() => handleCancel()}>cancel</button>}
            </form>
            <form onSubmit={(e)=>{
              e.preventDefault()
              if(newSourceId === newTargetId){
                alert('source and target must be different')
                return
              }fetch('http://localhost:8000/relationships', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({source_id: Number(newSourceId), target_id: Number(newTargetId), label: newLabel})
              })              
              .then(res => res.json())
              .then(created =>{
                setRelationships([...relationships, created])
                setNewLabel('')
                setNewSourceId('')
                setNewTargetId('')
                
              })
            }}>
            <select className="border border-gray-300 rounded px-2 py-1" value={newSourceId} onChange={e =>
              setNewSourceId(e.target.value)}>
              <option value="">source...</option>
              {entities.map(e=> <option value={e.id} key={e.id}>{e.name}</option>)}
            </select>          
            <input className="border border-gray-300 rounded px-2 py-1" value={newLabel} onChange={(e)=> setNewLabel(e.target.value)} placeholder='label...' />
            <select className="border border-gray-300 rounded px-2 py-1" value={newTargetId} onChange={e=> setNewTargetId(e.target.value)}>
              <option value="">target...</option>
              {entities.map(e=> <option value={e.id} key={e.id}>{e.name}</option>)}
            </select>
            <button type="submit" className='bg-blue-500 text-white rounded px-3 py-1 hover:bg-blue-600 whitespace-nowrap'>add link</button>
            </form>
            {loading && <p className='text-purple-800'>Loading...</p>}
            {error && <p className='text-purple-800'>something wrong...</p>}
            {!loading && !error && (
          <ul>
            {entities.map((entity) => {
              const rel = relationships.filter( r=> r.source_id === entity.id) 
              const sourceLabel = rel?.map( r => r.label)
              const targetId = rel?.map(t => t.target_id)
              const targetName = targetId.map(n => entities.find(e => e.id === n)?.name ?? '???')
              
              const typeName = types.find(t => t.id === entity.entity_type_id)?.name
              return <EntityCard entity={entity} typeName={typeName} sourceLabel={sourceLabel} targetName={targetName} onDelete={handleDelete} onEdit={handleEdit} key={entity.id} />
            })} 
          </ul>
          )}
        </div> 
  )
}

export default App
