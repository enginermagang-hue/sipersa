import { getQuery } from 'h3'
import { useDb } from '../../../utils/db'
import { createSession, SESSION_COOKIE } from '../../../utils/session'
import { exchangeCodeForToken, getGoogleUserFromTokens } from '../../../utils/google-oauth'
import { GOOGLE_STATE_COOKIE, getGoogleStateCookie } from '../../../utils/google-state'
import { logActivity } from '../../../utils/logger'

function isPopupRequest(event: any) {
  return getCookie(event, 'google_oauth_popup') === '1'
}

function popupResponse(event: any, payload: { type: string; error?: string }, fallbackUrl: string) {
  const isPopup = isPopupRequest(event)
  deleteCookie(event, 'google_oauth_popup')
  if (isPopup) {
    setHeader(event, 'content-type', 'text/html; charset=utf-8')
    const data = JSON.stringify(payload)
    const origin = getRequestURL(event).origin
    return `<!doctype html><html><head><meta charset="utf-8"><title>Google Login</title></head><body><script>
      (function(){
        try{
          if(window.opener && !window.opener.closed){
            window.opener.postMessage(${data}, '${origin}');
          }
        }catch(e){}
        try{ window.close(); }catch(e){}
        setTimeout(function(){
          window.location.replace(${JSON.stringify(fallbackUrl)});
        }, 800);
      })();
    <\/script><p>Mengalihkan... <a href="${fallbackUrl}">klik di sini jika tidak tertutup</a></p></body></html>`
  }
  return sendRedirect(event, fallbackUrl)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const error = query.error

  if (error) {
    if (error === 'access_denied') {
      return popupResponse(event, { type: 'google-auth-error', error: 'google-cancelled' }, '/login?error=google-cancelled')
    }
    return popupResponse(event, { type: 'google-auth-error', error: 'google' }, '/login?error=google')
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const stateCookie = getGoogleStateCookie(event)

  if (!code || !state || state !== stateCookie) {
    deleteCookie(event, GOOGLE_STATE_COOKIE)
    return popupResponse(event, { type: 'google-auth-error', error: 'google' }, '/login?error=google')
  }
  deleteCookie(event, GOOGLE_STATE_COOKIE)

  const db = useDb()
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''
  const ua = getRequestHeader(event, 'user-agent') ?? ''

  let googleUser: { googleId: string; email: string; nama: string }
  try {
    const tokens = await exchangeCodeForToken(code)
    googleUser = await getGoogleUserFromTokens(tokens)
  } catch (e: any) {
    console.error('Google token/userinfo error:', e)
    return popupResponse(event, { type: 'google-auth-error', error: 'google' }, '/login?error=google')
  }

  const emailNorm = googleUser.email.trim().toLowerCase()
  const googleId = googleUser.googleId

  try {
    let user: any = null

    // 1) Prioritas: cari via google_id dulu (login returning user)
    const byGoogle = await db.execute({
      sql: `SELECT * FROM users WHERE google_id = ? AND deleted_at IS NULL LIMIT 1`,
      args: [googleId]
    })
    if (byGoogle.rows.length > 0) {
      user = byGoogle.rows[0] as any
    } else {
      // 2) Fallback: cari via email yang dinormalisasi (case-insensitive, trim)
      // Hanya email terdaftar yang boleh login — tidak auto-create
      const byEmail = await db.execute({
        sql: `SELECT * FROM users WHERE LOWER(TRIM(email)) = ? AND deleted_at IS NULL LIMIT 1`,
        args: [emailNorm]
      })
      if (byEmail.rows.length > 0) {
        user = byEmail.rows[0] as any
      }
    }

    if (!user) {
      console.warn(`[google-login] unregistered email attempt: ${emailNorm} (googleId=${googleId}) ip=${ip}`)
      await logActivity({ userId: null as any, action: 'LOGIN_GOOGLE_UNREGISTERED', entity: 'users', entityId: null as any, detail: `email=${emailNorm} googleId=${googleId}`, ip }).catch(() => {})
      return popupResponse(event, { type: 'google-auth-error', error: 'google-unregistered' }, '/login?error=google-unregistered')
    }
    if (user.status !== 'active') {
      console.warn(`[google-login] inactive user: ${user.id} email=${emailNorm} ip=${ip}`)
      return popupResponse(event, { type: 'google-auth-error', error: 'google-inactive' }, '/login?error=google-inactive')
    }

    // Cegah hijack: jika googleId sudah dipakai user lain, jangan auto-link
    if (user.google_id !== googleId) {
      const owner = await db.execute({
        sql: `SELECT id FROM users WHERE google_id = ? AND id != ? LIMIT 1`,
        args: [googleId, user.id]
      })
      if (owner.rows.length > 0) {
        console.error(`[google-login] google_id collision: googleId=${googleId} already owned by user ${ (owner.rows[0] as any).id }, attempted link to ${user.id}`)
        return popupResponse(event, { type: 'google-auth-error', error: 'google' }, '/login?error=google')
      }
      // Pastikan email di DB memang cocok (case-insensitive) sebelum link — jangan link jika email DB tidak sama
      const dbEmailNorm = (user.email || '').trim().toLowerCase()
      if (dbEmailNorm && dbEmailNorm !== emailNorm) {
        // Ini kasus login via google_id yang sudah match di step 1, jadi tidak sampai sini.
        // Jika sampai sini berarti byEmail tidak ketemu tapi byGoogle ketemu — sudah handled.
        // Untuk byEmail match, dbEmailNorm == emailNorm pasti true karena query LOWER(TRIM(email)) = ?
        // Jadi check ini hanya safety.
        console.warn(`[google-login] email mismatch before link: db=${dbEmailNorm} google=${emailNorm}`)
        return popupResponse(event, { type: 'google-auth-error', error: 'google-unregistered' }, '/login?error=google-unregistered')
      }
      try {
        await db.execute({
          sql: 'UPDATE users SET google_id = ? WHERE id = ?',
          args: [googleId, user.id]
        })
      } catch (e: any) {
        // Unique violation (race) -> tolak
        if (String(e?.message || '').includes('UNIQUE') || String(e?.cause || '').includes('UNIQUE')) {
          console.error('[google-login] unique violation on google_id link', e)
          return popupResponse(event, { type: 'google-auth-error', error: 'google' }, '/login?error=google')
        }
        throw e
      }
    }

    const { token, expires } = await createSession(user.id, ip, ua)
    await db.execute({
      sql: `UPDATE users SET last_login = datetime('now') WHERE id = ?`,
      args: [user.id]
    })
    await logActivity({ userId: user.id, action: 'LOGIN', entity: 'users', entityId: user.id, ip })

    setCookie(event, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: new Date(expires),
      secure: !import.meta.dev
    })

    return popupResponse(event, { type: 'google-auth-success' }, '/')
  } catch (e: any) {
    console.error('Google login DB error:', e)
    return popupResponse(event, { type: 'google-auth-error', error: 'google' }, '/login?error=google')
  }
})
