import type { Request, Response } from "express"

export async function handleFunnelEvent(req: Request, res: Response) {
  try {
    const body = req.body

    if (!body.step) {
      return res.status(400).json({ error: "Funnel step is required" })
    }

    console.log("[Funnel Event]", {
      step: body.step,
      properties: body.properties,
      timestamp: body.timestamp,
      url: body.url,
      sessionId: body.sessionId,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("[Funnel] Error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}