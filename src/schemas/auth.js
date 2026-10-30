// ==============================================================================
// BERKAS: src/schemas/auth.js
// TUJUAN: Skema validasi Zod untuk endpoint autentikasi / login.
// RUJUKAN SLIDE:
//   - Slide 45: "Tanpa token / token invalid / expired -> 401"
//   - Slide 48: "Langkah 1: Login alice & Langkah 8: Login bob"
//   - Slide 50: "Password salah -> 401 tanpa bocor detail"
// ==============================================================================

import { z } from "zod";

export const LoginSchema = z
  .object({
    username: z.string({ required_error: "Username wajib diisi" }).min(1, "Username tidak boleh kosong"),
    password: z.string({ required_error: "Password wajib diisi" }).min(1, "Password tidak boleh kosong"),
  })
  .strict();
