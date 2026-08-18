import { useState, useEffect } from 'react'
import './App.css'

type Entity = { 
  id: number  
  name: string  
  entity_type_id: number 
}

type EntityType = {
  id: number
  name: string
}

function EntityCard(
  {
  entity, 
  typeName, 
  onDelete,
  onEdit
}:
{
  entity: Entity, 
  typeName?: string, 
  onDelete: (id: number) => void,
  onEdit:(entity: Entity) => void
}) { 
  return <li className='p-3 m-4 rounded-lg border border-gray-200 bg-white shadow-sm'>
    <span className='font-medium'>{entity.name}</span>{' - '}
    <span className='font-medium text-gray-500'>{typeName}</span>{' '}
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
            {loading && <p className='text-purple-800'>Loading...</p>}
            {error && <p className='text-purple-800'>something wrong...</p>}
            {!loading && !error && (
          <ul>
            {entities.map((entity) => {
              const typeName = types.find(t => t.id === entity.entity_type_id)?.name
              return <EntityCard entity={entity} typeName={typeName} onDelete={handleDelete} onEdit={handleEdit} key={entity.id} />
            })} 
          </ul>
          )}
        </div> 
  )
}

export default App
