// import { useState } from 'react'
import './App.css'

type Entity = { 
  name: string  
  kind: string   
}

function EntityCard({entity}:{entity: Entity}) { 
  return <li>{entity.name} — {entity.kind}</li>
}


function App() {
  const entities: Entity[] = [ 
    {
      name: 'Batman', kind: 'Character'

    } 
  ]
  return (
        <div>
          <h1>lorepsum</h1>
          <p>The story is about to begin.</p>
          <ul>
            {entities.map((entity) => <EntityCard entity={entity} key={entity.name} />)} 
          </ul>
         
        </div> 
  )
}

export default App
