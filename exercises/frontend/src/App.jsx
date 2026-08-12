import { useState } from "react"

function Book(props) {
  return <li>{props.title}</li>
}

function App() {
  const [countBooks, setCountBooks] = useState(0)
  const [books, setBooks] = useState([])
  const [newTitle, setNewTitle] = useState('')
  return (
    <>
  <h1 className="text-3xl font-bold text-blue-500">Lorepsum</h1>
      <p>Books read: {countBooks}</p>
    <button onClick={() => setCountBooks(countBooks + 1)}>
      I read a book
    </button>
    <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}/>
    <button onClick={() => setBooks([...books, newTitle])}>Adicionar livro</button>
    <ul>
      {books.map((book) => <Book title={book} key={book}/>)}     
    </ul>
    </>
  )
}

export default App

