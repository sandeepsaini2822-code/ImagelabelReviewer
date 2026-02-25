// app/api/images/update/route.ts
import { NextResponse } from "next/server"
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
import { cookies } from "next/headers"
import { verifyCognitoIdToken } from "@/lib/auth"

const region = process.env.AWS_REGION!
const table = process.env.DYNAMO_TABLE_NAME!
const db = new DynamoDBClient({ region })

function asTrimmedString(v: any) {
  if (typeof v !== "string") return undefined
  return v.trim()
}

export async function PUT(req: Request) {
  try {
    const cookieName = process.env.AUTH_COOKIE_NAME ?? "agri_auth"
    const cookieStore = await cookies()
    const token = cookieStore.get(cookieName)?.value

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", message: "Auth cookie missing" },
        { status: 401 }
      )
    }

    let user: any
    try {
      user = await verifyCognitoIdToken(token)
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid/expired session" }, { status: 401 })
    }

    const body = await req.json()

    // ✅ PK in your table is `id`
    const id = body.id ?? body.key
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id/key" }, { status: 400 })
    }

    // ---------- accept UI names ----------
    const plantingDate = asTrimmedString(body.plantingDate)

    const pestPresent = typeof body.pestDetected === "boolean" ? body.pestDetected : undefined
    const diseasePresent = typeof body.diseaseDetected === "boolean" ? body.diseaseDetected : undefined

    // UI sends goldStandard (mapped from isGoldStandard)
    const isGoldStandard = typeof body.goldStandard === "boolean" ? body.goldStandard : undefined

    const pestName = asTrimmedString(body.pestName)
    const pestStage = asTrimmedString(body.pestStage)

    const diseaseName = asTrimmedString(body.diseaseName)
    const diseaseStage = asTrimmedString(body.diseaseStage) // ✅ will be stored

    const cropStage = asTrimmedString(body.cropStage)
    const remarks = asTrimmedString(body.remarks)

    // Optional crop edit
    const cropName = asTrimmedString(body.crop)

    const lastUpdatedBy = asTrimmedString(user?.email)
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

    // ✅ DB attribute names (your schema)
    setString("plantingDate", "#pld", ":pld", plantingDate)

    setBool("pestPresent", "#pp", ":pp", pestPresent)
    setBool("diseasePresent", "#dp", ":dp", diseasePresent)

    setBool("isGoldStandard", "#gs", ":gs", isGoldStandard)

    setString("pestName", "#pn", ":pn", pestName)
    setString("pestStage", "#ps", ":ps", pestStage)

    setString("diseaseName", "#dn", ":dn", diseaseName)
    setString("diseaseStage", "#ds", ":ds", diseaseStage) // ✅ NEW FIELD
    setString("cropStage", "#cs", ":cs", cropStage)

    setString("remarks", "#rm", ":rm", remarks)

    setString("cropName", "#cn", ":cn", cropName)

    // always track update time; updatedBy only if available
    setString("lastUpdatedAt", "#lua", ":lua", lastUpdatedAt)
    setString("lastUpdatedBy", "#lub", ":lub", lastUpdatedBy)

    if (sets.length === 0) {
      return NextResponse.json({ ok: false, error: "No allowed fields to update" }, { status: 400 })
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