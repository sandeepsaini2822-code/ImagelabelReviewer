// app/api/stats/route.ts
import { NextResponse } from "next/server"
import { DynamoDBClient, ScanCommand, QueryCommand } from "@aws-sdk/client-dynamodb"
import { unmarshall } from "@aws-sdk/util-dynamodb"

const region = process.env.AWS_REGION!
const table = process.env.DYNAMO_TABLE_NAME!
const db = new DynamoDBClient({ region })

function normalizeStr(v: any) {
  return (v ?? "").toString().trim()
}
function normalizeLower(v: any) {
  return normalizeStr(v).toLowerCase()
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    const cropRaw = url.searchParams.get("crop")
    const crop = cropRaw ? normalizeLower(cropRaw) : null

    const farmerRaw = url.searchParams.get("farmer")
    const farmer = farmerRaw ? normalizeStr(farmerRaw) : null

    const pest = url.searchParams.get("pestDetected") // "true" | "false" | null
    const disease = url.searchParams.get("diseaseDetected") // "true" | "false" | null

    const usingFarmerQuery = !!farmer && farmer !== "all"
    const usingCropQuery = !!crop && crop !== "all"

    // Non-key filters only
    const filterParts: string[] = []
    const exprNames: Record<string, string> = {}
    const exprValues: Record<string, any> = {}

    if (pest === "true" || pest === "false") {
      filterParts.push("#pp = :pp")
      exprNames["#pp"] = "pestPresent"
      exprValues[":pp"] = { BOOL: pest === "true" }
    }

    if (disease === "true" || disease === "false") {
      filterParts.push("#dp = :dp")
      exprNames["#dp"] = "diseasePresent"
      exprValues[":dp"] = { BOOL: disease === "true" }
    }

    let total = 0
    let verified = 0

    // helper: count a page of unmarshalled items (+ optional crop check)
    const countRows = (rows: any[], cropNeed?: string | null) => {
      for (const d of rows) {
        if (cropNeed && normalizeLower(d.cropName) !== cropNeed) continue
        total += 1
        if (d.isGoldStandard === true) verified += 1
      }
    }

    // paginate
    let ExclusiveStartKey: any = undefined

    if (usingFarmerQuery) {
      do {
        const res = await db.send(
          new QueryCommand({
            TableName: table,
            IndexName: "GSI_FarmerNameTimestamp",
            KeyConditionExpression: "#fn = :fn",
            ExpressionAttributeNames: {
              "#fn": "farmerName",
              ...exprNames,
            },
            ExpressionAttributeValues: {
              ":fn": { S: farmer! },
              ...exprValues,
            },
            ProjectionExpression: "id, cropName, isGoldStandard", // keep it light
            ExclusiveStartKey,
            ...(filterParts.length ? { FilterExpression: filterParts.join(" AND ") } : {}),
          })
        )

        const rows = (res.Items ?? []).map((it) => unmarshall(it))
        // if crop also selected, filter crop in code (same trick as images)
        countRows(rows, usingCropQuery ? crop : null)

        ExclusiveStartKey = res.LastEvaluatedKey
      } while (ExclusiveStartKey)
    } else if (usingCropQuery) {
      do {
        const res = await db.send(
          new QueryCommand({
            TableName: table,
            IndexName: "GSI_CropNameTimestamp",
            KeyConditionExpression: "#crop = :crop",
            ExpressionAttributeNames: {
              "#crop": "cropName",
              ...exprNames,
            },
            ExpressionAttributeValues: {
              ":crop": { S: crop! },
              ...exprValues,
            },
            ProjectionExpression: "id, isGoldStandard",
            ExclusiveStartKey,
            ...(filterParts.length ? { FilterExpression: filterParts.join(" AND ") } : {}),
          })
        )

        const rows = (res.Items ?? []).map((it) => unmarshall(it))
        countRows(rows)

        ExclusiveStartKey = res.LastEvaluatedKey
      } while (ExclusiveStartKey)
    } else {
      // All data (scan)
      do {
        const res = await db.send(
          new ScanCommand({
            TableName: table,
            ProjectionExpression: "id, cropName, farmerName, isGoldStandard, pestPresent, diseasePresent",
            ExclusiveStartKey,
            ...(filterParts.length
              ? {
                  FilterExpression: filterParts.join(" AND "),
                  ExpressionAttributeNames: exprNames,
                  ExpressionAttributeValues: exprValues,
                }
              : {}),
          })
        )

        const rows = (res.Items ?? []).map((it) => unmarshall(it))

        // If UI still passes farmer/crop even when you scan (rare), handle it safely:
        const cropNeed = usingCropQuery ? crop : null
        const farmerNeed = usingFarmerQuery ? farmer : null

        for (const d of rows) {
          if (farmerNeed && normalizeStr(d.farmerName) !== farmerNeed) continue
          if (cropNeed && normalizeLower(d.cropName) !== cropNeed) continue
          total += 1
          if (d.isGoldStandard === true) verified += 1
        }

        ExclusiveStartKey = res.LastEvaluatedKey
      } while (ExclusiveStartKey)
    }

    return NextResponse.json({ ok: true, total, verified })
  } catch (e: any) {
    console.error("STATS ERROR:", e)
    return NextResponse.json(
      { ok: false, error: "Failed to compute stats", message: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}