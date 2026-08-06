import { useState } from "react"

function Book(props) {
  return <li>{props.title}</li>
}

function App() {
  const [countBooks, setCountBooks] = useState(0)
  const [addBooks, setAddBooks] = useState(props.title)
  return (
    <>
  <h1>Lorepsum</h1>
      <p>Books read: {countBooks}</p>
    <button onClick={() => setCountBooks(countBooks + 1)}>
      I read a book
    </button>
    <ul>
    <Book title="Pride and Prejudice" />
    <Book title="Crime and Punishment" />
    <Book title="Moby-Dick" />
    </ul>
    </>
  )
}

export default App