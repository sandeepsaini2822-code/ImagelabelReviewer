//app\api\images\route.ts
import { NextResponse } from "next/server";
import { DynamoDBClient, ScanCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { unmarshall } from "@aws-sdk/util-dynamodb";

const region = process.env.AWS_REGION!;

const bucket = process.env.S3_BUCKET_NAME!;
const table = process.env.DYNAMO_TABLE_NAME!;

const db = new DynamoDBClient({ region });
const s3 = new S3Client({ region });

// ----- cursor helpers -----
function encodeCursor(lastKey: any) {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey)).toString("base64url");
}
function decodeCursor(cursor: string | null) {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // pagination
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
    const cursor = url.searchParams.get("cursor");
    const ExclusiveStartKey = decodeCursor(cursor);

    // filters
    const cropRaw = url.searchParams.get("crop"); // from UI
    const crop = cropRaw ? cropRaw.trim().toLowerCase() : null; // normalize

    const pest = url.searchParams.get("pestDetected"); // "true" | "false"
    const disease = url.searchParams.get("diseaseDetected"); // "true" | "false"
    const gold = url.searchParams.get("goldStandard"); // "true" | "false"

    // FilterExpression for boolean filters
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

    if (gold === "true") {
      // only items explicitly marked true
      filterParts.push("#gs = :gsT")
      exprNames["#gs"] = "isGoldStandard"
      exprValues[":gsT"] = { BOOL: true }
    } else if (gold === "false") {
      // treat missing as false
      filterParts.push("(attribute_not_exists(#gs) OR #gs = :gsF)")
      exprNames["#gs"] = "isGoldStandard"
      exprValues[":gsF"] = { BOOL: false }
    }



    let result;

    const usingCropQuery = !!crop && crop !== "all";

    if (usingCropQuery) {
      // ✅ Query using GSI_CropCreatedAt (YOU MUST CREATE THIS INDEX)
      result = await db.send(
        new QueryCommand({
          TableName: table,
          IndexName: "GSI_CropNameTimestamp", // create this (step 2 below)
          KeyConditionExpression: "#crop = :crop",
          ExpressionAttributeNames: {
            "#crop": "cropName",
            ...exprNames,
          },
          ExpressionAttributeValues: {
            ":crop": { S: crop }, // crop already lowercased from UI
            ...exprValues,
          },
          Limit: limit,
          ExclusiveStartKey,
          ScanIndexForward: false, // newest first by timestamp
          ...(filterParts.length ? { FilterExpression: filterParts.join(" AND ") } : {}),
        })
      );

    } else {
      // ⛔ fallback Scan when crop=all (not scalable, but works)
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
      );
    }

    const items = (result.Items ?? []).map((item) => {
      const data: any = unmarshall(item);

      // In your new schema, `imageUrl` is actually the S3 key/path
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
        cropStage: data.cropStage ?? "",

        remarks: data.remarks ?? "",

        s3Key, // ✅ use the variable (not overwrite)
      }




    });
    const EXPIRES_SECONDS = 60 * 60 // 1 hour

    const images = await Promise.all(
      items.map(async (img) => {
        if (!img.s3Key) {
          return { ...img, imageUrl: "" }
        }

        try {
          const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: bucket,
              Key: img.s3Key,
            }),
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
      nextCursor: encodeCursor(result.LastEvaluatedKey),
    });
  } catch (error) {
    console.error("IMAGES ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
