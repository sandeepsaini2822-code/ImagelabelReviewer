import { jwtVerify, createRemoteJWKSet, JWTPayload } from "jose"

const region = process.env.AWS_REGION!
const userPoolId = process.env.COGNITO_USER_POOL_ID!
const clientId = process.env.COGNITO_CLIENT_ID!

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("jwtVerify timeout")), ms)
    p.then((v) => { clearTimeout(t); resolve(v) })
     .catch((e) => { clearTimeout(t); reject(e) })
  })
}

export async function verifyCognitoIdToken(idToken: string): Promise<JWTPayload> {
  const { payload } = await withTimeout(
    jwtVerify(idToken, jwks, { issuer, audience: clientId, clockTolerance: 60 }),
    4000
  )
  return payload
}
