type SessionOpener = (sessionID: string, directory: string) => void

let _sessionOpener: SessionOpener | null = null

export const setSessionOpener = (opener: SessionOpener | null) => {
  _sessionOpener = opener
}
