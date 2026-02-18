import { NextResponse } from "next/server"
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
import { cookies } from "next/headers"
import { verifyCognitoIdToken } from "@/lib/auth"

const region = process.env.AWS_REGION!
const table = process.env.DYNAMO_TABLE_NAME!

const db = new DynamoDBClient({ region })

export async function PUT(req: Request) {
  try {
    const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"

    // ✅ In your Next version, cookies() is async
    const cookieStore = await cookies()
    const token = cookieStore.get(cookieName)?.value

    // ✅ Safe debug (no token printing)
    console.log("🔐 AUTH COOKIE CHECK:", {
      cookieName,
      hasToken: !!token,
      tokenLen: token?.length ?? 0,
      cookieNames: cookieStore.getAll().map((c) => c.name),
    })

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", message: "Auth cookie missing" },
        { status: 401 }
      )
    }

    let user: any
    try {
      user = await verifyCognitoIdToken(token)
    } catch (err) {
      console.error("❌ verifyCognitoIdToken failed:", err)
      return NextResponse.json(
        { ok: false, error: "Invalid/expired session", message: "Token verification failed" },
        { status: 401 }
      )
    }

    console.log("✅ AUTH OK:", { email: user?.email, sub: user?.sub })

    const body = await req.json()

    const id = body.id ?? body.key
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id/key" }, { status: 400 })
    }

    // ✅ WHITELIST ONLY
    const plantingDate = typeof body.plantingDate === "string" ? body.plantingDate : undefined

    const pestPresent = typeof body.pestDetected === "boolean" ? body.pestDetected : undefined

    const diseasePresent =
      typeof body.diseaseDetected === "boolean" ? body.diseaseDetected : undefined

    // ⚠️ Client must send goldStandard (your saveChanges does)
    const isGoldStandard =
      typeof body.goldStandard === "boolean" ? body.goldStandard : undefined

    const pestName = typeof body.pestName === "string" ? body.pestName : undefined
    const diseaseName = typeof body.diseaseName === "string" ? body.diseaseName : undefined
    const cropStage = typeof body.cropStage === "string" ? body.cropStage : undefined
    const remarks = typeof body.remarks === "string" ? body.remarks : undefined
    const pestStage = typeof body.pestStage === "string" ? body.pestStage : undefined

    const lastUpdatedBy = typeof user?.email === "string" ? user.email : undefined
    const lastUpdatedAt = new Date().toISOString()

    const exprNames: Record<string, string> = {}
    const exprValues: Record<string, any> = {}
    const sets: string[] = []

    function setString(attrName: string, nameKey: string, valueKey: string, value?: string) {
      if (value === undefined) return
      exprNames[nameKey] = attrName
      exprValues[valueKey] = { S: value }
      sets.push(`${nameKey} = ${valueKey}`)
    }

    function setBool(attrName: string, nameKey: string, valueKey: string, value?: boolean) {
      if (value === undefined) return
      exprNames[nameKey] = attrName
      exprValues[valueKey] = { BOOL: value }
      sets.push(`${nameKey} = ${valueKey}`)
    }

    setString("plantingDate", "#pld", ":pld", plantingDate)
    setBool("pestPresent", "#pp", ":pp", pestPresent)
    setBool("diseasePresent", "#dp", ":dp", diseasePresent)
    setBool("isGoldStandard", "#gs", ":gs", isGoldStandard)

    setString("pestName", "#pn", ":pn", pestName)
    setString("diseaseName", "#dn", ":dn", diseaseName)
    setString("cropStage", "#cs", ":cs", cropStage)
    setString("remarks", "#rm", ":rm", remarks)
    setString("pestStage", "#ps", ":ps", pestStage)

    setString("lastUpdatedBy", "#lub", ":lub", lastUpdatedBy)
    setString("lastUpdatedAt", "#lua", ":lua", lastUpdatedAt)

    if (sets.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No allowed fields to update" },
        { status: 400 }
      )
    }

    await db.send(
      new UpdateItemCommand({
        TableName: table,
        Key: { id: { S: String(id) } },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: "NONE",
      })
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("❌ UPDATE ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to update image", message: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
