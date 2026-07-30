import {
  answerPlantQuestion,
  PlantChatError,
} from "../../backend/plant-chat/plant-chat.service";

/** Receives one chat turn and returns private, preliminary plant guidance. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const attachments = form
      .getAll("attachments")
      .filter((value): value is File => value instanceof File);
    const result = await answerPlantQuestion({
      prompt: String(form.get("prompt") ?? "").slice(0, 2001),
      attachments,
    });

    return Response.json(result, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof PlantChatError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Dokter Plant could not answer this message.";

    return Response.json({ error: message }, { status });
  }
}
