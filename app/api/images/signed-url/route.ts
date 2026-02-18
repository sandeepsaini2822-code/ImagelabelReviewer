import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const runtime = "nodejs"

const region = process.env.AWS_REGION!
const bucket = process.env.S3_BUCKET_NAME!
const s3 = new S3Client({ region })

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 })
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 }
    )

    return NextResponse.json({ url })
  } catch (error) {
    console.error("SIGNED URL ERROR:", error)
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 })
  }
}
