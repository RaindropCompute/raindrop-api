import { z } from "zod";
import { Request, Response, RequestHandler } from "express";
import { ExpressRequestWithAuth } from "@clerk/express";

type JSON =
  | { [key: string]: JSON | undefined }
  | string
  | number
  | boolean
  | null
  | JSON[];

export class ApiError extends Error {
  status: number;
  body: JSON;

  constructor(status: number, body: JSON) {
    super(`${status} error`);
    this.status = status;
    this.body = body;
  }
}

type SignedInRequest = ExpressRequestWithAuth & {
  auth: {
    sessionId: string;
    userId: string;
    orgId: string | undefined;
    orgSlug: string | undefined;
    factorVerificationAge: [number, number] | null;
  };
};

export function withValidation<
  Ret extends JSON | undefined,
  Body extends z.ZodTypeAny
>(
  schema: Body,
  handler: (body: z.infer<Body>, req: SignedInRequest) => Promise<Ret>
): RequestHandler;
export function withValidation<Ret extends JSON | undefined>(
  handler: (req: SignedInRequest) => Promise<Ret>
): RequestHandler;
export function withValidation<
  Ret extends JSON | undefined,
  Body extends z.ZodTypeAny
>(
  schemaOrHandler:
    | Body
    | ((body: z.infer<Body>, req: SignedInRequest) => Promise<Ret>),
  maybeHandler?: (body: z.infer<Body>, req: SignedInRequest) => Promise<Ret>
) {
  return async (req1: Request, res: Response) => {
    const req = req1 as ExpressRequestWithAuth;
    try {
      if (!req.auth.userId || !req.auth.sessionId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      let ret: Ret;
      if (maybeHandler) {
        const handler = maybeHandler as (
          body: Body,
          req: SignedInRequest
        ) => Promise<Ret>;
        const schema = schemaOrHandler as Body;
        const body = schema.parse(req.body) as z.infer<Body>;
        ret = await handler(body, req as SignedInRequest);
      } else {
        const handler = schemaOrHandler as (
          req: SignedInRequest
        ) => Promise<Ret>;
        ret = await handler(req as SignedInRequest);
      }

      if (ret !== undefined) {
        res.json(ret);
      } else {
        res.status(204).end();
      }
    } catch (error) {
      console.error(error);

      if (error instanceof z.ZodError) {
        res.status(400).json({ issues: error.issues });
      } else if (error instanceof ApiError) {
        res.status(error.status).json(error.body);
      } else {
        res.status(500).json({ message: String(error) });
      }
    }
  };
}
