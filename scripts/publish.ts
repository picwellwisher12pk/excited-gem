import { readFileSync } from "fs";
import { join } from "path";

const CWS_API = "https://www.googleapis.com/chromewebstore/v1.1";
const CWS_UPLOAD_API = "https://www.googleapis.com/upload/chromewebstore/v1.1";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface CWSUploadResponse {
  kind: string;
  id: string;
  uploadState: "SUCCESS" | "FAILURE" | "IN_PROGRESS" | "NOT_FOUND";
  itemError?: { error_code: string; error_detail: string }[];
}

interface CWSPublishResponse {
  kind: string;
  item_id: string;
  status: string[];
  statusDetail: string[];
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    throw new Error(`Failed to get access token: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.access_token;
}

async function uploadZip(token: string, extensionId: string, zipPath: string): Promise<CWSUploadResponse> {
  const zipData = readFileSync(zipPath);
  console.log(`📦 ZIP size: ${(zipData.length / 1024 / 1024).toFixed(2)} MB`);

  const resp = await fetch(`${CWS_UPLOAD_API}/items/${extensionId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-goog-api-version": "2",
    },
    body: zipData,
  });

  const result: CWSUploadResponse = await resp.json();
  return result;
}

async function verifyDraftVersion(token: string, extensionId: string, expectedVersion: string): Promise<boolean> {
  const resp = await fetch(`${CWS_API}/items/${extensionId}?projection=DRAFT`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await resp.json();
  const draftVersion = data.crxVersion;
  console.log(`📋 Draft version on CWS: ${draftVersion} (expected: ${expectedVersion})`);

  return draftVersion === expectedVersion;
}

async function publishExtension(token: string, extensionId: string): Promise<CWSPublishResponse> {
  const resp = await fetch(`${CWS_API}/items/${extensionId}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Length": "0",
    },
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Publish failed with HTTP ${resp.status}: ${errorText}`);
  }

  return await resp.json();
}

async function run() {
  try {
    const keysPath = join(process.cwd(), "keys.json");
    const keys = JSON.parse(readFileSync(keysPath, "utf8"));
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const { extId, clientId, clientSecret, refreshToken } = keys.chrome;
    const expectedVersion = pkg.version;

    console.log(`🚀 Publishing v${expectedVersion} to Chrome Web Store...`);
    console.log(`🆔 Extension ID: ${extId}\n`);

    // Step 1: Get access token
    console.log("🔑 Getting access token...");
    const token = await getAccessToken(clientId, clientSecret, refreshToken);
    console.log("✅ Access token obtained\n");

    // Step 2: Upload ZIP
    const zipPath = join(process.cwd(), "build/chrome-mv3-prod.zip");
    console.log(`📤 Uploading ${zipPath}...`);
    const uploadResult = await uploadZip(token, extId, zipPath);

    if (uploadResult.uploadState !== "SUCCESS") {
      console.error("\n❌ Upload FAILED!");
      console.error(`   State: ${uploadResult.uploadState}`);
      if (uploadResult.itemError) {
        for (const err of uploadResult.itemError) {
          console.error(`   Error: ${err.error_code}`);
          console.error(`   Detail: ${err.error_detail}`);
        }
      }
      process.exit(1);
    }
    console.log("✅ Upload successful\n");

    // Step 3: Verify draft version
    console.log("🔍 Verifying draft version...");
    const versionMatch = await verifyDraftVersion(token, extId, expectedVersion);
    if (!versionMatch) {
      console.error(`\n❌ Draft version mismatch! Expected ${expectedVersion} but CWS has a different version.`);
      process.exit(1);
    }
    console.log("✅ Draft version verified\n");

    // Step 4: Submit for review
    console.log("📝 Submitting for review...");
    const publishResult = await publishExtension(token, extId);

    if (!publishResult.status.includes("OK")) {
      console.error("\n❌ Publish FAILED!");
      console.error(`   Status: ${publishResult.status.join(", ")}`);
      console.error(`   Detail: ${publishResult.statusDetail.join(", ")}`);
      process.exit(1);
    }

    console.log("✅ Submitted for review\n");
    console.log(`🎉 v${expectedVersion} successfully uploaded and submitted to Chrome Web Store!`);
  } catch (error) {
    console.error("❌ Publication failed:", error);
    process.exit(1);
  }
}

run();
