// app/api/images/route.ts
import { NextResponse } from "next/server"
import { DynamoDBClient, ScanCommand, QueryCommand } from "@aws-sdk/client-dynamodb"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { unmarshall } from "@aws-sdk/util-dynamodb"

const region = process.env.AWS_REGION!
const bucket = process.env.S3_BUCKET_NAME!
const table = process.env.DYNAMO_TABLE_NAME!

const db = new DynamoDBClient({ region })
const s3 = new S3Client({ region })

// ----- cursor helpers -----
function encodeCursor(lastKey: any) {
  if (!lastKey) return null
  return Buffer.from(JSON.stringify(lastKey)).toString("base64url")
}
function decodeCursor(cursor: string | null) {
  if (!cursor) return undefined
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
  } catch {
    return undefined
  }
}

function normalizeStr(v: any) {
  return (v ?? "").toString().trim()
}
function normalizeLower(v: any) {
  return normalizeStr(v).toLowerCase()
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    // pagination
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200)
    const cursor = url.searchParams.get("cursor")
    const ExclusiveStartKey = decodeCursor(cursor)

    // filters
    const cropRaw = url.searchParams.get("crop")
    const crop = cropRaw ? normalizeLower(cropRaw) : null

    const farmerRaw = url.searchParams.get("farmer")
    const farmer = farmerRaw ? normalizeStr(farmerRaw) : null

    const pest = url.searchParams.get("pestDetected") // "true" | "false"
    const disease = url.searchParams.get("diseaseDetected") // "true" | "false"
    const gold = url.searchParams.get("goldStandard") // "true" | "false"

    const usingFarmerQuery = !!farmer && farmer !== "all"
    const usingCropQuery = !!crop && crop !== "all"

    // IMPORTANT:
    // - farmer/crop go in KeyConditionExpression (when using their GSI)
    // - only NON-key filters go in FilterExpression
    const filterParts: string[] = []
    const exprNames: Record<string, string> = {}
    const exprValues: Record<string, any> = {}

    // pest filter
    if (pest === "true" || pest === "false") {
      filterParts.push("#pp = :pp")
      exprNames["#pp"] = "pestPresent"
      exprValues[":pp"] = { BOOL: pest === "true" }
    }

    // disease filter
    if (disease === "true" || disease === "false") {
      filterParts.push("#dp = :dp")
      exprNames["#dp"] = "diseasePresent"
      exprValues[":dp"] = { BOOL: disease === "true" }
    }

    // gold filter
    if (gold === "true") {
      filterParts.push("#gs = :gsT")
      exprNames["#gs"] = "isGoldStandard"
      exprValues[":gsT"] = { BOOL: true }
    } else if (gold === "false") {
      filterParts.push("(attribute_not_exists(#gs) OR #gs = :gsF)")
      exprNames["#gs"] = "isGoldStandard"
      exprValues[":gsF"] = { BOOL: false }
    }

    let result: any
    let rawUnmarshalled: any[] | null = null // used only for farmer+crop workaround

    // ✅ CASE 1: Farmer selected (and optionally crop)
    if (usingFarmerQuery) {
      // DynamoDB applies Limit BEFORE FilterExpression.
      // If crop is also selected, we must keep fetching pages until we collect enough matches.
      if (usingCropQuery) {
        const collected: any[] = []
        let startKey: any = ExclusiveStartKey
        const HARD_PAGE = 200

        do {
          const page = await db.send(
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
              Limit: HARD_PAGE,
              ExclusiveStartKey: startKey,
              ScanIndexForward: false,
              ...(filterParts.length ? { FilterExpression: filterParts.join(" AND ") } : {}),
            })
          )

          const pageData = (page.Items ?? []).map((it) => unmarshall(it))
          const cropMatches = pageData.filter((d) => normalizeLower(d.cropName) === crop)

          collected.push(...cropMatches)
          startKey = page.LastEvaluatedKey

          if (collected.length >= limit) break
        } while (startKey)

        rawUnmarshalled = collected.slice(0, limit)
        result = { LastEvaluatedKey: startKey }
      } else {
        // farmer only
        result = await db.send(
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
            Limit: limit,
            ExclusiveStartKey,
            ScanIndexForward: false,
            ...(filterParts.length ? { FilterExpression: filterParts.join(" AND ") } : {}),
          })
        )
      }

      // ✅ CASE 2: Crop selected (no farmer)
    } else if (usingCropQuery) {
      result = await db.send(
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
          Limit: limit,
          ExclusiveStartKey,
          ScanIndexForward: false,
          ...(filterParts.length ? { FilterExpression: filterParts.join(" AND ") } : {}),
        })
      )

      // ✅ CASE 3: no farmer, no crop
    } else {
      result = await db.send(
        new ScanCommand({
          TableName: table,
          Limit: limit,
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
    }

    // Convert result to array of unmarshalled objects
    const dataRows: any[] =
      rawUnmarshalled ??
      (result?.Items ?? []).map((item: any) => unmarshall(item))

    const items = dataRows.map((data: any) => {
      const s3Key = data.imageUrl ?? data.s3Key ?? ""

      return {
        key: data.id ?? "",

        farmer: data.farmerName ?? "",
        crop: data.cropName ?? "",
        weatherLocation: data.weatherLocation ?? "",

        createdAt: data.timestamp ?? new Date().toISOString(),
        plantingDate: data.plantingDate ?? "",

        pestDetected: !!data.pestPresent,
        diseaseDetected: !!data.diseasePresent,

        isGoldStandard: !!data.isGoldStandard,

        pestName: data.pestName ?? "",
        pestStage: data.pestStage ?? "",

        diseaseName: data.diseaseName ?? "",
        diseaseStage: data.diseaseStage ?? "", // ✅ NEW FIELD
        cropStage: data.cropStage ?? "",

        remarks: data.remarks ?? "",

        s3Key,
      }
    })

    const EXPIRES_SECONDS = 60 * 60

    const images = await Promise.all(
      items.map(async (img) => {
        if (!img.s3Key) return { ...img, imageUrl: "" }

        try {
          const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucket, Key: img.s3Key }),
            { expiresIn: EXPIRES_SECONDS }
          )
          return { ...img, imageUrl: signedUrl }
        } catch (e) {
          console.error("SIGN URL ERROR:", img.s3Key, e)
          return { ...img, imageUrl: "" }
        }
      })
    )

    return NextResponse.json({
      items: images,
      nextCursor: encodeCursor(result?.LastEvaluatedKey),
    })
  } catch (error: any) {
    console.error("IMAGES ERROR:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch images",
        message: error?.message ?? String(error),
        name: error?.name ?? "UnknownError",
        meta: error?.$metadata ?? null,
      },
      { status: 500 }
    )
  }
}