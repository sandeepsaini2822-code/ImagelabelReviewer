//app\api\upload\route.ts

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";

/* ---------------- AWS Clients ---------------- */

const region = process.env.AWS_REGION!;

const s3 = new S3Client({ region });
const db = new DynamoDBClient({ region });

/* ---------------- POST /api/upload ---------------- */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const farmer = formData.get("farmer") as string | null;
    const crop = formData.get("crop") as string | null;

    if (!file || !farmer || !crop) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ---------- Prepare S3 upload ---------- */

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = randomUUID();
    const s3Key = `images/${id}-${file.name}`;

    /* ---------- Upload to S3 ---------- */

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;

    /* ---------- Save metadata to DynamoDB ---------- */

    await db.send(
      new PutItemCommand({
        TableName: process.env.DYNAMO_TABLE_NAME!,
        Item: marshall({
          key: id,              // 🔑 Partition key (matches table)
          s3Key,                // 🔥 REQUIRED for signed URLs
          imageUrl,             // optional (debug / fallback)
          farmer,
          crop,
          createdAt: new Date().toISOString(),
        }),
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
