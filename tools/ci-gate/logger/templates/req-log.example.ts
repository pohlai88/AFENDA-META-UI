/**
 * Request Logger Examples
 * ========================
 * Correct patterns for using req.log in Express route handlers.
 */

type Request = {
  params: { id?: string };
  body: unknown;
  session?: { uid?: string };
  log?: {
    info: (obj: unknown, message: string) => void;
    error: (obj: unknown, message: string) => void;
  };
};

type Response = {
  json: (payload: unknown) => void;
  status: (code: number) => Response;
};

const logger = {
  info: (_obj: unknown, _message: string) => undefined,
  error: (_obj: unknown, _message: string) => undefined,
};

async function fetchOrder(id: string): Promise<{ id: string }> {
  return { id };
}

async function createOrder(_body: unknown): Promise<{ id: string }> {
  return { id: "example-id" };
}

// ✅ CORRECT: Use req.log in route handlers (automatic requestId tracing)
export async function getOrderHandler(req: Request, res: Response) {
  const id = req.params.id ?? "unknown-id";

  try {
    const order = await fetchOrder(id);
    res.json({ data: order });
  } catch (err) {
    // req.log automatically includes: requestId, method, url, userId
    (req as any).log?.error({ err, orderId: id }, "Failed to fetch order");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ❌ WRONG: Using root logger in route handler (loses requestId context)

export async function getOrderHandlerWrong(req: Request, res: Response) {
  const id = req.params.id ?? "unknown-id";

  try {
    const order = await fetchOrder(id);
    res.json({ data: order });
  } catch (err) {
    // This won't include requestId for tracing
    logger.error({ err, orderId: id }, "Failed to fetch order");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ✅ CORRECT: Fallback to root logger when req.log might not exist
export function gracefulLogging(req: Request, res: Response) {
  try {
    // ...
  } catch (err) {
    const log = (req as any).log ?? logger;
    log.error({ err }, "Error in handler");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ✅ CORRECT: Success logging with structured data
export async function createOrderHandler(req: Request, res: Response) {
  try {
    const order = await createOrder(req.body);

    (req as any).log?.info(
      { orderId: order.id, userId: req.session?.uid },
      "Order created successfully"
    );

    res.status(201).json({ data: order });
  } catch (err) {
    (req as any).log?.error({ err, body: req.body }, "Failed to create order");
    res.status(500).json({ error: "Internal server error" });
  }
}
