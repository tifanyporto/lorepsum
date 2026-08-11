import { useState } from 'react'
import './App.css'

type Entity = { 
  name: string  
  kind: string   
}

function EntityCard({entity}:{entity: Entity}) { 
  return <li>{entity.name} — {entity.kind}</li>
}


function App() {
  //const entities: Entity[] = [ {name: 'Batman', kind: 'Character'}]
  const [entities, setEntities] = useState<Entity[]>([])
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState('')
  return (
        <div>
          <h1>lorepsum</h1>
          <p>The story is about to begin.</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            setEntities([...entities, {name: newName, kind: newKind}])
            setNewName('')
            setNewKind('')
          }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='name' />
          <input value={newKind} onChange={(e) => setNewKind(e.target.value)} placeholder='kind' />
          <button type='submit'>Add entity</button>
            </form>
          <ul>
            {entities.map((entity) => <EntityCard entity={entity} key={entity.name} />)} 
          </ul>
        </div> 
  )
}

export default App
