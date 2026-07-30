import {
  PlantCheckError,
  screenPlant,
} from "../../backend/plant-check/plant-check.service";
import type { PlantSymptom } from "../../backend/plant-check/plant-check.types";

const validSymptoms = new Set<PlantSymptom>([
  "spots",
  "yellowing",
  "holes",
  "powder",
  "wilting",
  "insects",
]);

/** Accepts one plant photo plus field observations and returns a safe screening. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    const symptoms = form
      .getAll("symptoms")
      .map(String)
      .filter((value): value is PlantSymptom =>
        validSymptoms.has(value as PlantSymptom),
      );

    if (!(image instanceof File)) {
      throw new PlantCheckError("A plant image is required.");
    }

    const result = await screenPlant({
      crop: String(form.get("crop") ?? ""),
      symptoms,
      notes: String(form.get("notes") ?? "").slice(0, 1000),
      image,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    const status = error instanceof PlantCheckError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to screen this plant.";

    return Response.json({ error: message }, { status });
  }
}
