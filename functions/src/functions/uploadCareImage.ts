/**
 * 画像アップロード関数
 * ケア記録に添付する画像をGoogle Driveにアップロード
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import Busboy from "busboy";
import {Readable} from "stream";
import {
  uploadImage,
  generateFileName,
  getExtensionFromMimeType,
} from "../services/driveService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  UploadCareImageResponse,
  ErrorCodes,
} from "../types";

/**
 * 許可されるMIMEタイプ
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * 最大ファイルサイズ（10MB）
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Firebase Functions用の拡張Request型
 */
interface FunctionsRequest extends Request {
  rawBody?: Buffer;
}

/**
 * multipart/form-data をパース
 */
function parseMultipartForm(
  req: FunctionsRequest
): Promise<{
  fields: Record<string, string>;
  file: { buffer: Buffer; mimeType: string; filename: string } | null;
}> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({headers: req.headers});
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileMimeType = "";
    let originalFilename = "";

    busboy.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    busboy.on(
      "file",
      (
        _fieldname: string,
        file: Readable,
        info: { filename: string; encoding: string; mimeType: string }
      ) => {
        const {filename, mimeType} = info;
        originalFilename = filename;
        fileMimeType = mimeType;

        const chunks: Buffer[] = [];
        let totalSize = 0;
        let sizeExceeded = false;

        file.on("data", (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE) {
            sizeExceeded = true;
            file.resume(); // ストリームを消費して終了させる
            return;
          }
          chunks.push(chunk);
        });

        file.on("end", () => {
          if (sizeExceeded) {
            reject(
              new Error(
                `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
              )
            );
            return;
          }
          fileBuffer = Buffer.concat(chunks);
        });
      }
    );

    busboy.on("finish", () => {
      resolve({
        fields,
        file: fileBuffer ?
          {buffer: fileBuffer, mimeType: fileMimeType, filename: originalFilename} :
          null,
      });
    });

    busboy.on("error", (error: Error) => {
      reject(error);
    });

    // リクエストボディをbusboyにパイプ
    if (req.rawBody) {
      busboy.end(req.rawBody);
    } else {
      req.pipe(busboy);
    }
  });
}

/**
 * uploadCareImage 関数本体
 */
async function uploadCareImageHandler(
  req: FunctionsRequest,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use POST.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    // multipart/form-data をパース
    const {fields, file} = await parseMultipartForm(req);

    // バリデーション
    if (!fields.staffId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "staffId is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    if (!fields.residentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "residentId is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    if (!file) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "image file is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    functions.logger.info("uploadCareImage started", {
      staffId: fields.staffId,
      residentId: fields.residentId,
      mimeType: file.mimeType,
      fileSize: file.buffer.length,
    });

    // ファイル名を生成
    const extension = getExtensionFromMimeType(file.mimeType);
    const fileName = generateFileName(fields.residentId, extension);

    // Driveにアップロード
    const uploadResult = await uploadImage(file.buffer, fileName, file.mimeType);

    const responseData: UploadCareImageResponse = {
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      publicUrl: uploadResult.publicUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
    };

    const response: ApiResponse<UploadCareImageResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("uploadCareImage completed", {
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("uploadCareImage error", error);

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.DRIVE_API_ERROR,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
}

/**
 * Cloud Functions エクスポート
 */
export const uploadCareImage = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(uploadCareImageHandler);
