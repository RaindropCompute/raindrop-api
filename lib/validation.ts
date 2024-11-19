import { ZodSchema } from "zod";
import { Request, Response } from "express";

export function route<Body, Params, Query, Ret>(
  schemas: {
    bodySchema?: ZodSchema<Body>;
    paramsSchema?: ZodSchema<Params>;
    querySchema?: ZodSchema<Query>;
  },
  handler: ({
    body,
    params,
    query,
  }: {
    body: Body;
    params: Params;
    query: Query;
    req: Request;
    res: Response;
  }) => Ret
) {
  return async (req: Request, res: Response) => {
    try {
      // TODO fix types
      const body = schemas.bodySchema?.parse(req.body)!;
      const params = schemas.paramsSchema?.parse(req.params)!;
      const query = schemas.querySchema?.parse(req.query)!;

      const ret = await handler({ body, params, query, req, res });
      if (ret) {
        res.json(ret);
      } else {
        res.end();
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
}
