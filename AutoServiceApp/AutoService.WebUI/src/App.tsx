import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1 className="text-3xl font-bold text-blue-600 mb-4 text-center">
        Autószerviz Dashboard
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <p className="text-gray-700">A Tailwind CSS sikeresen beállítva!</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
          </button>
          <p>
          Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
      </div>
    </>
  )
}

export default App