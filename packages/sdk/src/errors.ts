import type { TrustMeshErrorCode } from "@trustmesh/shared";

export class TrustMeshError extends Error {
  readonly code: TrustMeshErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: TrustMeshErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TrustMeshError";
    this.code = code;
    this.details = details;
  }
}