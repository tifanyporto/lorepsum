import { useState } from 'react'
import './App.css'

type Entity = { 
  name: string  
  kind: string   
}

function EntityCard({entity}:{entity: Entity}) { 
  return <li className='p-3 m-4 rounded-lg border border-gray-200 bg-white shadow-sm'>
    <span className='font-medium'>{entity.name}</span>{' '}
    <span className='text-gray-500'>{entity.kind}</span>
  </li>
}


function App() {
  //const entities: Entity[] = [ {name: 'Batman', kind: 'Character'}]
  const [entities, setEntities] = useState<Entity[]>([])
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState('')
  return (
        <div className='max-w-md mx-auto p-6'>
          <h1 className='text-3xl font-bold text-blue-500'>lorepsum</h1>
          <p>The story is about to begin.</p>
          <form className='flex gap-2 mb-4' onSubmit={(e) => {
            e.preventDefault()
            setEntities([...entities, {name: newName, kind: newKind}])
            setNewName('')
            setNewKind('')
          }}>
          <input className="border border-gray-300 rounded px-2 py-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='name' />
          <input  value={newKind} onChange={(e) => setNewKind(e.target.value)} placeholder='kind' />
          <button className="bg-blue-500 text-white rounded px-3 py-1 hover:bg-blue-600 whitespace-nowrap" type='submit'>Add entity</button>
            </form>
          <ul>
            {entities.map((entity) => <EntityCard entity={entity} key={entity.name} />)} 
          </ul>
        </div> 
  )
}

export default App
