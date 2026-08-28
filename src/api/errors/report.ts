import type { Request, Response } from "express"

export async function handleErrorReport(req: Request, res: Response) {
  try {
    const body = req.body

    if (!body.message) {
      return res.status(400).json({ error: "Error message is required" })
    }

    console.error("[Error Report]", {
      message: body.message,
      stack: body.stack,
      componentStack: body.componentStack,
      url: body.url,
      userAgent: body.userAgent,
      timestamp: body.timestamp,
      userId: body.userId,
      metadata: body.metadata,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("[Error Report] Error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}