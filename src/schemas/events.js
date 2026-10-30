// ==============================================================================
// BERKAS: src/schemas/events.js
// TUJUAN: Mendefinisikan skema validasi Zod untuk kontrak payload Webhook TaskHub.
// RUJUKAN SLIDE:
//   - Slide 9: "Kontrak webhook TaskHub: { id, type: 'task.completed.v1', data: { taskId } }"
//   - Slide 22: "const TaskCompletedEvent = z.object({ id: z.string(), type: z.string(), data: z.object({ taskId: z.string() }) }).strict();"
//   - Slide 33: "Uji negatif webhook: Event type tidak sesuai -> 422; taskId bukan string -> 422"
// PRINSIP KEAMANAN:
//   - Skema Ketat (.strict()): Menolak atribut tak dikenal (mencegah payload injection).
//   - Kontrak Eksplisit: Memastikan tipe event sesuai versi yang disepakati.
// ==============================================================================

import { z } from "zod";

// Skema kontrak payload event task.completed.v1 TaskHub (Slide 22)
export const TaskCompletedEvent = z
  .object({
    // ID unik event (misal: "evt_demo_001")
    id: z
      .string({ required_error: "Atribut 'id' wajib diisi" })
      .min(1, "Event ID tidak boleh kosong"),

    // Tipe event harus persis "task.completed.v1" (Slide 9 & 33)
    type: z
      .literal("task.completed.v1", {
        errorMap: () => ({ message: "Tipe event tidak sesuai kontrak (harus 'task.completed.v1')" }),
      }),

    // Data muatan domain yang relevan
    data: z
      .object({
        // taskId wajib berupa string (Slide 33)
        taskId: z
          .string({ required_error: "Atribut 'taskId' wajib ada di dalam data" })
          .min(1, "taskId tidak boleh berupa string kosong"),
      })
      .strict(),
  })
  .strict(); // Mencegah penambahan properti berbahaya di luar kontrak
