import { useState, useEffect } from "react";

function ThemeToggle() {
    const [dark, setDark] = useState(false)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }, [dark])

    return <button onClick={()=> setDark(!dark)}
    className="size-9 rounded-full border border-line flex items-center justify-center text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors">
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
    </button>
    
}


export default ThemeToggle