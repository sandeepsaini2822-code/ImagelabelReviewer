// app/api/farmers/route.ts
import { NextResponse } from "next/server"
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb"
import { unmarshall } from "@aws-sdk/util-dynamodb"

const region = process.env.AWS_REGION!
const table = process.env.DYNAMO_TABLE_NAME!
const db = new DynamoDBClient({ region })

export async function GET() {
  try {
    const map = new Map<string, { farmer: string; total: number; verified: number }>()
    let ExclusiveStartKey: any = undefined

    let overallTotal = 0
    let overallVerified = 0

    do {
      const res = await db.send(
        new ScanCommand({
          TableName: table,
          ProjectionExpression: "farmerName, isGoldStandard",
          ExclusiveStartKey,
        })
      )

      for (const it of res.Items ?? []) {
        const d: any = unmarshall(it)
        const farmer = (d.farmerName ?? "").trim()
        if (!farmer) continue

        const isV = d.isGoldStandard === true

        // overall
        overallTotal += 1
        if (isV) overallVerified += 1

        // per farmer
        const cur = map.get(farmer) ?? { farmer, total: 0, verified: 0 }
        cur.total += 1
        if (isV) cur.verified += 1
        map.set(farmer, cur)
      }

      ExclusiveStartKey = res.LastEvaluatedKey
    } while (ExclusiveStartKey)

    const farmers = Array.from(map.values()).sort((a, b) => a.farmer.localeCompare(b.farmer))

    return NextResponse.json({
      ok: true,
      overall: { total: overallTotal, verified: overallVerified },
      farmers,
    })
  } catch (e: any) {
    console.error("FARMERS ERROR:", e)
    return NextResponse.json({ ok: false, error: "Failed to load farmers" }, { status: 500 })
  }
}