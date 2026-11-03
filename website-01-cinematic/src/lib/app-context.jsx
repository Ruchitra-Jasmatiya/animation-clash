import { createContext, useContext } from 'react'

/** `ready` flips to true once the preloader has finished, which starts the hero animations. */
export const AppContext = createContext({ ready: true })
export const useApp = () => useContext(AppContext)
