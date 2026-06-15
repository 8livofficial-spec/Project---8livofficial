import { useEffect, useRef } from 'react'

export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up')
          entry.target.classList.remove('opacity-0')
          // Optional: stop observing once animated to keep it visible
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return ref
}
