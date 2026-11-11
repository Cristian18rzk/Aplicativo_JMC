import type { Metadata } from "next";
import { PrimerIngresoForm } from "@/components/auth/PrimerIngresoForm";

export const metadata: Metadata = { title: "Primer ingreso" };

export default function PaginaPrimerIngreso() {
  return <PrimerIngresoForm />;
}
