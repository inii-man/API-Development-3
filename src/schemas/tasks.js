// ==============================================================================
// BERKAS: src/schemas/tasks.js
// TUJUAN: Skema validasi Zod untuk resource TaskHub (Create, Update, dan Proteksi Mass Assignment).
// RUJUKAN SLIDE:
//   - Slide 45: "owner_id/role dikirim client -> 422" (Mencegah Privilege Escalation / Mass Assignment).
//   - Slide 45: "PATCH dengan version lama -> 409" (Optimistic Concurrency Control).
//   - Slide 48: "Alur langkah 3, 6, 7, 10" (Verifikasi integritas input pengguna).
// ==============================================================================

import { z } from "zod";

// Skema pembuatan Task baru
// Catatan: Properti 'owner_id' dan 'role' sengaja tidak dimasukkan ke dalam skema.
// Penanganan eksplisit Mass Assignment dilakukan di layer router (Slide 45).
export const CreateTaskSchema = z
  .object({
    title: z
      .string({ required_error: "Judul task wajib diisi" })
      .min(1, "Judul task minimal 1 karakter"),
    description: z.string().optional(),
    status: z.enum(["open", "done", "completed"]).default("open"),
  })
  .strict();

// Skema pembaruan Task (PATCH) dengan Version Locking
export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["open", "done", "completed"]).optional(),
    // Versi saat ini yang dipegang oleh client untuk Optimistic Concurrency Control (Slide 45 & 48)
    version: z
      .number({ required_error: "Versi (version) wajib disertakan saat melakukan PATCH" })
      .int("Versi harus berupa bilangan bulat")
      .positive("Versi harus bernilai positif"),
  })
  .strict();
