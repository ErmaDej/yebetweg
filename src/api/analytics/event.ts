import type { Request, Response } from "express"

export async function handleAnalyticsEvent(req: Request, res: Response) {
  try {
    const body = req.body

    if (!body.name) {
      return res.status(400).json({ error: "Event name is required" })
    }

    console.log("[Analytics Event]", {
      name: body.name,
      properties: body.properties,
      timestamp: body.timestamp,
      url: body.url,
      language: body.properties?.language,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("[Analytics] Error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}