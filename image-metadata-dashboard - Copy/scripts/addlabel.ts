
import "dotenv/config";


import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const db = new DynamoDBClient({ region: "eu-north-1" });
const TABLE = "Imagemetadata";

async function run() {
  const scan = await db.send(new ScanCommand({ TableName: TABLE }));

  for (const item of scan.Items || []) {
    const data = unmarshall(item);

    // Skip if labels already exist
    if (data.labels) continue;

    await db.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ key: data.key }),
        UpdateExpression: "SET labels = :labels",
        ExpressionAttributeValues: marshall({
          ":labels": {
            crop: data.crop ?? "",
            cropStage: "",
            farmer: data.farmer ?? "",
            disease: false,
            diseaseName: "",
            healthy: false,
            pestPresent: false,
            pestName: "",
            pestStage: "",
            location: "",
            captureDate: "",
            annamStandard: false,
          },
        }),
      })
    );

    console.log("Updated:", data.key);
  }
}

run();
